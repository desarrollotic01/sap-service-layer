const {
  Tratamiento,
  Aviso,
  sequelize,
  SolicitudCompra,
  SolicitudCompraLinea,
  TratamientoEquipo,
  TratamientoEquipoActividad,
  PlanMantenimiento,
  PlanMantenimientoActividad,
  Equipo,
  UbicacionTecnica,
} = require("../db_connection");

const toMinutes = (valor, unidad) => {
  if (valor === null || valor === undefined) return null;
  const v = Number(valor);
  if (Number.isNaN(v)) return null;
  return unidad === "h" ? Math.round(v * 60) : Math.round(v);
};

const crearTratamiento = async ({ avisoId, body, usuarioId }) => {
  const t = await sequelize.transaction();

  try {
    const { tratamiento, solicitudGeneral, solicitudesPorEquipo = {} } = body;

    /* ===============================
       VALIDACIONES BASE
    =============================== */
    if (!tratamiento) throw new Error("Datos de tratamiento requeridos");

    if (!solicitudGeneral) throw new Error("Debe enviar la solicitud general");
    if (!Array.isArray(solicitudGeneral.lineas) || solicitudGeneral.lineas.length === 0) {
      throw new Error("La solicitud general debe tener al menos una línea");
    }

    /* ===============================
       VALIDAR QUE NO EXISTA
    =============================== */
    const existe = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (existe) throw new Error("Este aviso ya tiene un tratamiento registrado");

    /* ===============================
       OBTENER AVISO + TARGETS
    =============================== */
    const aviso = await Aviso.findByPk(avisoId, {
      include: [
        { association: "equiposRelacion" },
        { association: "ubicacionesRelacion" },
      ],
      transaction: t,
    });

    if (!aviso) throw new Error("Aviso no encontrado");

    const targets = [
      ...(aviso.equiposRelacion || []).map((rel) => ({
        equipoId: rel.equipoId,
        ubicacionId: null,
      })),
      ...(aviso.ubicacionesRelacion || []).map((rel) => ({
        equipoId: null,
        ubicacionId: rel.ubicacionId,
      })),
    ].filter((x) => x.equipoId || x.ubicacionId);

    if (!targets.length) {
      throw new Error("El aviso no tiene equipos ni ubicaciones técnicas asociadas");
    }

    for (const target of targets) {
      if (!target.equipoId && !target.ubicacionId) {
        throw new Error("Se encontró un target inválido sin equipoId ni ubicacionId");
      }
    }

    /* ===============================
       1️⃣ CREAR TRATAMIENTO (cabecera)
    =============================== */
    const nuevoTratamiento = await Tratamiento.create(
      {
        aviso_id: avisoId,
        creado_por: usuarioId,
        estado: "CON_SOLICITUD",
      },
      { transaction: t }
    );

    /* ===============================
       2️⃣ CREAR TRATAMIENTO_EQUIPOS + ACTIVIDADES
       SOPORTA EQUIPO Y UBICACION TECNICA
    =============================== */
    for (const target of targets) {
      const targetKey = String(target.equipoId || target.ubicacionId);

      const te = await TratamientoEquipo.create(
        {
          tratamientoId: nuevoTratamiento.id,
          equipoId: target.equipoId,
          ubicacionTecnicaId: target.ubicacionId,
        },
        { transaction: t }
      );

      /* =====================================
         🔵 PREVENTIVO → PLAN SELECCIONADO
         EQUIPO o UBICACION TECNICA
      ===================================== */
      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Preventivo"
      ) {
        const planIdSeleccionado = tratamiento.planesSeleccionados?.[targetKey];

        if (!planIdSeleccionado) {
          throw new Error(
            `Debe seleccionar un plan para ${
              target.equipoId ? "el equipo" : "la ubicación técnica"
            } ${targetKey}`
          );
        }

        const plan = await PlanMantenimiento.findByPk(planIdSeleccionado, {
          include: [{ association: "actividades" }],
          transaction: t,
        });

        if (!plan) {
          throw new Error(
            `Plan no válido para ${
              target.equipoId ? "el equipo" : "la ubicación técnica"
            } ${targetKey}`
          );
        }

        if (target.equipoId && plan.contextoObjetivo !== "EQUIPO") {
          throw new Error(
            `El plan seleccionado no corresponde al contexto EQUIPO (${targetKey})`
          );
        }

        if (target.ubicacionId && plan.contextoObjetivo !== "UBICACION_TECNICA") {
          throw new Error(
            `El plan seleccionado no corresponde al contexto UBICACION_TECNICA (${targetKey})`
          );
        }

        await te.update({ planMantenimientoId: plan.id }, { transaction: t });

        for (const act of plan.actividades || []) {
          const unidad = act.unidadDuracion || "min";
          const min = act.duracionMinutos ?? null;
          const valor =
            min == null ? null : unidad === "h" ? Number(min) / 60 : Number(min);

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              planMantenimientoActividadId: act.id,

              codigoActividad: act.codigoActividad || null,
              sistema: act.sistema,
              subsistema: act.subsistema,
              componente: act.componente,
              tarea: act.tarea,
              tipoTrabajo: act.tipoTrabajo,
              rolTecnico: act.rolTecnico,
              cantidadTecnicos: act.cantidadTecnicos ?? 1,

              duracionEstimadaValor: valor,
              unidadDuracion: unidad,
              duracionEstimadaMin: min,

              origen: "PLAN",
              estado: "PENDIENTE",
            },
            { transaction: t }
          );
        }
      }

      /* =====================================
         🔴 CORRECTIVO → ACTIVIDADES MANUALES
         EQUIPO o UBICACION TECNICA
      ===================================== */
      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Correctivo"
      ) {
        const manuales = tratamiento.actividadesManuales?.[targetKey] || [];

        if (!Array.isArray(manuales)) {
          throw new Error(
            `Actividades manuales inválidas para ${
              target.equipoId ? "equipo" : "ubicación técnica"
            } ${targetKey}`
          );
        }

        if (manuales.length === 0) {
          throw new Error(
            `Debe agregar actividades manuales para ${
              target.equipoId ? "equipo" : "ubicación técnica"
            } ${targetKey}`
          );
        }

        for (const act of manuales) {
          if (!act.tarea || !act.tarea.trim()) {
            throw new Error(
              `Actividad manual sin tarea para ${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey}`
            );
          }

          if (act.tipoTrabajo && !["REPARACION", "CAMBIO"].includes(act.tipoTrabajo)) {
            throw new Error(
              `TipoTrabajo inválido (solo REPARACION o CAMBIO) para ${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey}`
            );
          }

          if (!act.rolTecnico) {
            throw new Error(
              `rolTecnico es obligatorio en actividad manual (${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey})`
            );
          }

          if (!act.cantidadTecnicos || act.cantidadTecnicos <= 0) {
            throw new Error(
              `cantidadTecnicos debe ser > 0 en actividad manual (${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey})`
            );
          }

          const unidad = act.unidadDuracion || "min";
          const min =
            act.duracionEstimadaMin ?? toMinutes(act.duracionEstimadaValor, unidad);

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,

              planMantenimientoActividadId: null,
              codigoActividad: null,

              sistema: act.sistema || null,
              subsistema: act.subsistema || null,
              componente: act.componente || null,

              tarea: act.tarea.trim(),
              descripcion: act.descripcion || null,

              tipoTrabajo: act.tipoTrabajo || "REPARACION",

              rolTecnico: act.rolTecnico,
              cantidadTecnicos: act.cantidadTecnicos,

              duracionEstimadaValor: act.duracionEstimadaValor ?? null,
              unidadDuracion: unidad,
              duracionEstimadaMin: min,

              observaciones: act.observaciones || null,
              origen: "MANUAL",
              estado: "PENDIENTE",
            },
            { transaction: t }
          );
        }
      }
    }

    /* ===============================
       3️⃣ SOLICITUD GENERAL
    =============================== */
    const solicitudGen = await SolicitudCompra.create(
      {
        tratamiento_id: nuevoTratamiento.id,
        esGeneral: true,
        docDate: new Date(),
        requiredDate: solicitudGeneral.requiredDate,
        department: solicitudGeneral.department,
        requester: solicitudGeneral.email,
        comments: solicitudGeneral.comments,
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      solicitudGeneral.lineas.map((l) => ({
        solicitud_compra_id: solicitudGen.id,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.quantity,
        costingCode: l.costCenter,
        projectCode: l.projectCode,
        warehouseCode: l.warehouseCode || "01",
        rubro: l.rubro,
        paqueteTrabajo: l.paqueteTrabajo,
      })),
      { transaction: t }
    );

    /* ===============================
       4️⃣ SOLICITUDES POR TARGET
    =============================== */
    for (const target of targets) {
      const key = String(target.equipoId || target.ubicacionId);
      const dataSolicitud = solicitudesPorEquipo[key];
      if (!dataSolicitud) continue;

      const solicitud = await SolicitudCompra.create(
        {
          tratamiento_id: nuevoTratamiento.id,
          equipo_id: target.equipoId,
          ubicacion_tecnica_id: target.ubicacionId,
          esGeneral: false,
          docDate: new Date(),
          requiredDate: dataSolicitud.requiredDate,
          department: dataSolicitud.department,
          requester: dataSolicitud.email,
          comments: dataSolicitud.comments,
          usuario_id: usuarioId,
          estado: "DRAFT",
        },
        { transaction: t }
      );

      await SolicitudCompraLinea.bulkCreate(
        dataSolicitud.lineas.map((l) => ({
          solicitud_compra_id: solicitud.id,
          itemCode: l.itemCode,
          description: l.description,
          quantity: l.quantity,
          costingCode: l.costCenter,
          projectCode: l.projectCode,
          warehouseCode: l.warehouseCode || "01",
          rubro: l.rubro,
          paqueteTrabajo: l.paqueteTrabajo,
        })),
        { transaction: t }
      );
    }

    /* ===============================
       5️⃣ ACTUALIZAR AVISO
    =============================== */
    await Aviso.update(
      { estadoAviso: "tratado" },
      { where: { id: avisoId }, transaction: t }
    );

    const tratamientoCompleto = await Tratamiento.findByPk(nuevoTratamiento.id, {
      include: [
        {
          model: SolicitudCompra,
          as: "solicitudesCompra",
          include: [{ model: SolicitudCompraLinea, as: "lineas" }],
        },
        {
          model: TratamientoEquipo,
          as: "equipos",
          include: [
            { model: Equipo, as: "equipo" },
            { model: UbicacionTecnica, as: "ubicacionTecnica" },
            {
              model: TratamientoEquipoActividad,
              as: "actividades",
              include: [{ model: PlanMantenimientoActividad, as: "actividadPlan" }],
            },
            { model: PlanMantenimiento, as: "planMantenimiento" },
          ],
        },
      ],
      transaction: t,
    });

    await t.commit();
    return tratamientoCompleto;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const obtenerTratamientoPorAviso = async (avisoId) => {
  return Tratamiento.findOne({
    where: { aviso_id: avisoId },
    include: [
      {
        model: SolicitudCompra,
        as: "solicitudesCompra",
        include: [{ model: SolicitudCompraLinea, as: "lineas" }],
      },
      {
        model: TratamientoEquipo,
        as: "equipos",
        include: [
          { model: Equipo, as: "equipo" },
          { model: UbicacionTecnica, as: "ubicacionTecnica" },
          {
            model: TratamientoEquipoActividad,
            as: "actividades",
            include: [{ model: PlanMantenimientoActividad, as: "actividadPlan" }],
          },
          { model: PlanMantenimiento, as: "planMantenimiento" },
        ],
      },
    ],
  });
};

const upsertSolicitud = async ({
  tratamientoId,
  esGeneral,
  equipoId,
  ubicacionId,
  data,
  usuarioId,
  t,
}) => {
  const where = {
    tratamiento_id: tratamientoId,
    esGeneral: !!esGeneral,
    equipo_id: equipoId || null,
    ubicacion_tecnica_id: ubicacionId || null,
  };

  let solicitud = await SolicitudCompra.findOne({ where, transaction: t });

  const header = {
    docDate: new Date(),
    requiredDate: data.requiredDate,
    department: data.department,
    requester: data.email,
    comments: data.comments,
    usuario_id: usuarioId,
    estado: "DRAFT",
    tratamiento_id: tratamientoId,
    esGeneral: !!esGeneral,
    equipo_id: equipoId || null,
    ubicacion_tecnica_id: ubicacionId || null,
  };

  if (!solicitud) {
    solicitud = await SolicitudCompra.create(header, { transaction: t });
  } else {
    await solicitud.update(header, { transaction: t });

    await SolicitudCompraLinea.destroy({
      where: { solicitud_compra_id: solicitud.id },
      transaction: t,
    });
  }

  await SolicitudCompraLinea.bulkCreate(
    (data.lineas || []).map((l) => ({
      solicitud_compra_id: solicitud.id,
      itemCode: l.itemCode || null,
      description: l.description || null,
      quantity: Number(l.quantity),
      costingCode: l.costCenter || null,
      projectCode: l.projectCode || null,
      warehouseCode: l.warehouseCode || "01",
      rubro: l.rubro || null,
      paqueteTrabajo: l.paqueteTrabajo || null,
    })),
    { transaction: t }
  );

  return solicitud;
};

const guardarCambiosTratamiento = async ({ tratamientoId, body, usuarioId }) => {
  const t = await sequelize.transaction();

  try {
    const { actividades = [], solicitudGeneral, solicitudesPorEquipo = {} } = body || {};

    const tratamiento = await Tratamiento.findByPk(tratamientoId, { transaction: t });
    if (!tratamiento) throw new Error("Tratamiento no encontrado");

    if (Array.isArray(actividades) && actividades.length > 0) {
      for (const a of actividades) {
        const act = await TratamientoEquipoActividad.findByPk(a.id, {
          include: [
            {
              model: TratamientoEquipo,
              as: "tratamientoEquipo",
              attributes: ["id", "tratamientoId"],
            },
          ],
          transaction: t,
        });

        if (!act) throw new Error(`Actividad no encontrada: ${a.id}`);
        if (act.tratamientoEquipo?.tratamientoId !== tratamientoId) {
          throw new Error(`Actividad ${a.id} no pertenece a este tratamiento`);
        }

        const unidad = a.unidadDuracion || act.unidadDuracion || "min";
        const valor =
          a.duracionEstimadaValor !== undefined
            ? a.duracionEstimadaValor
            : act.duracionEstimadaValor;

        const min = toMinutes(valor, unidad);

        await act.update(
          {
            duracionEstimadaValor: valor ?? null,
            unidadDuracion: unidad,
            duracionEstimadaMin: min,
            ...(a.cantidadTecnicos !== undefined
              ? { cantidadTecnicos: Number(a.cantidadTecnicos) }
              : {}),
            ...(a.rolTecnico !== undefined ? { rolTecnico: a.rolTecnico } : {}),
            ...(a.estado ? { estado: a.estado } : {}),
          },
          { transaction: t }
        );
      }
    }

    await upsertSolicitud({
      tratamientoId,
      esGeneral: true,
      equipoId: null,
      ubicacionId: null,
      data: solicitudGeneral,
      usuarioId,
      t,
    });

    const tes = await TratamientoEquipo.findAll({
      where: { tratamientoId },
      attributes: ["equipoId", "ubicacionTecnicaId"],
      transaction: t,
    });

    const mapTargets = new Map();

    for (const te of tes) {
      if (te.equipoId) {
        mapTargets.set(String(te.equipoId), {
          equipoId: te.equipoId,
          ubicacionId: null,
        });
      }

      if (te.ubicacionTecnicaId) {
        mapTargets.set(String(te.ubicacionTecnicaId), {
          equipoId: null,
          ubicacionId: te.ubicacionTecnicaId,
        });
      }
    }

    for (const [key, dataSol] of Object.entries(solicitudesPorEquipo || {})) {
      if (!dataSol) continue;

      const target = mapTargets.get(String(key));
      if (!target) {
        throw new Error(`Target inválido en solicitudesPorEquipo: ${key}`);
      }

      await upsertSolicitud({
        tratamientoId,
        esGeneral: false,
        equipoId: target.equipoId,
        ubicacionId: target.ubicacionId,
        data: dataSol,
        usuarioId,
        t,
      });
    }

    await t.commit();
    return { ok: true, message: "Cambios guardados", tratamientoId };
  } catch (e) {
    await t.rollback();
    throw e;
  }
};

module.exports = {
  crearTratamiento,
  obtenerTratamientoPorAviso,
  guardarCambiosTratamiento,
};