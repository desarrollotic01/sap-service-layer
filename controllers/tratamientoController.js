const {
  Tratamiento,
  TratamientoTrabajador,
  Trabajador,
  Aviso,
  sequelize,
  SolicitudCompra,
  SolicitudCompraLinea,
  TratamientoEquipo,
  TratamientoEquipoActividad,
  PlanMantenimientoActividad,
  PlanMantenimiento,
  Equipo,
  TratamientoEquipoRequerimiento,
  TratamientoEquipoTrabajador,

} = require("../db_connection");

const { Op } = require("sequelize");

const crearTratamiento = async ({ avisoId, body, usuarioId }) => {
  const t = await sequelize.transaction();

  try {
    const {
      tratamiento,
      solicitudGeneral,
      solicitudesPorEquipo = {},
    } = body;

    /* ===============================
       VALIDACIONES BASE
    =============================== */

    if (!tratamiento) throw new Error("Datos de tratamiento requeridos");
    if (!tratamiento.contratista) throw new Error("El contratista es obligatorio");

    // ✅ Ahora los técnicos van por equipo/ubicación (tecnicosPorTarget)
    if (!tratamiento.tecnicosPorTarget || typeof tratamiento.tecnicosPorTarget !== "object") {
      throw new Error("Debe enviar tecnicosPorTarget (requerimientos por equipo/ubicación)");
    }

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
        ubicacionId: rel.ubicacionTecnicaId,
      })),
    ];

    if (!targets.length) {
      throw new Error("El aviso no tiene equipos ni ubicaciones técnicas asociadas");
    }

    /* ===============================
       1️⃣ CREAR TRATAMIENTO (cabecera)
    =============================== */

    const nuevoTratamiento = await Tratamiento.create(
      {
        aviso_id: avisoId,
        contratista: tratamiento.contratista,
        creado_por: usuarioId,
        estado: "CON_SOLICITUD",
      },
      { transaction: t }
    );

    /* ===============================
       2️⃣ CREAR TRATAMIENTO_EQUIPOS + TECNICOS + ACTIVIDADES
    =============================== */

    for (const target of targets) {
      const key = target.equipoId || target.ubicacionId;

      // ✅ Validar que exista requerimientos para este target
      const dataTec = tratamiento.tecnicosPorTarget?.[key];
      const reqs = dataTec?.requerimientos;

      if (!Array.isArray(reqs) || reqs.length === 0) {
        throw new Error(`Debe agregar requerimientos de técnicos para el target ${key}`);
      }

      // validar requerimientos
      for (const [i, req] of reqs.entries()) {
        if (!req.puestoTrabajo) {
          throw new Error(`Target ${key} - Requerimiento ${i + 1}: puestoTrabajo obligatorio`);
        }
        if (!req.cantidad || req.cantidad <= 0) {
          throw new Error(`Target ${key} - Requerimiento ${i + 1}: cantidad debe ser mayor a 0`);
        }
        if (req.personas && !Array.isArray(req.personas)) {
          throw new Error(`Target ${key} - Requerimiento ${i + 1}: personas debe ser un arreglo`);
        }
      }

      // ✅ crear TratamientoEquipo
      const te = await TratamientoEquipo.create(
        {
          tratamientoId: nuevoTratamiento.id,
          equipoId: target.equipoId,
          ubicacionTecnicaId: target.ubicacionId,
        },
        { transaction: t }
      );

      // ✅ guardar requerimientos por equipo/ubicación
      await TratamientoEquipoRequerimiento.bulkCreate(
        reqs.map((r) => ({
          tratamientoEquipoId: te.id,
          puestoTrabajo: r.puestoTrabajo,
          label: r.label || null,
          cantidad: r.cantidad,
        })),
        { transaction: t }
      );

      // ✅ asignación de técnicos por equipo/ubicación
      for (const req of reqs) {
        const seleccionados = Array.isArray(req.personas)
          ? req.personas.map((p) => (typeof p === "string" ? p : p.id))
          : [];

        // manuales
        for (const trabajadorId of seleccionados) {
          await TratamientoEquipoTrabajador.create(
            {
              tratamientoEquipoId: te.id,
              trabajadorId,
              puestoTrabajo: req.puestoTrabajo,
              estado: "ASIGNADO",
            },
            { transaction: t }
          );
        }

        // completar faltantes aleatorios
        const faltantes = req.cantidad - seleccionados.length;

        if (faltantes > 0) {
          const randoms = await Trabajador.findAll({
            where: {
              rol: req.puestoTrabajo, // ⚠️ AJUSTA si tu campo se llama distinto
              activo: true,
              ...(seleccionados.length && { id: { [Op.notIn]: seleccionados } }),
            },
            order: sequelize.random(),
            limit: faltantes,
            transaction: t,
          });

          await TratamientoEquipoTrabajador.bulkCreate(
            randoms.map((trab) => ({
              tratamientoEquipoId: te.id,
              trabajadorId: trab.id,
              puestoTrabajo: req.puestoTrabajo,
              estado: "ASIGNADO",
            })),
            { transaction: t }
          );
        }
      }

      /* =====================================
         🔵 PREVENTIVO → PLAN SELECCIONADO
      ===================================== */
      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Preventivo" &&
        target.equipoId
      ) {
        const planIdSeleccionado = tratamiento.planesSeleccionados?.[target.equipoId];

        if (!planIdSeleccionado) {
          throw new Error(`Debe seleccionar un plan para el equipo ${target.equipoId}`);
        }

        const plan = await PlanMantenimiento.findByPk(planIdSeleccionado, {
          include: [{ association: "actividades" }],
          transaction: t,
        });

        if (!plan) {
          throw new Error(`Plan no válido para el equipo ${target.equipoId}`);
        }

        await te.update({ planMantenimientoId: plan.id }, { transaction: t });

        for (const act of plan.actividades || []) {
          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              planMantenimientoActividadId: act.id,
              sistema: act.sistema,
              subsistema: act.subsistema,
              componente: act.componente,
              tarea: act.tarea,
              tipoTrabajo: act.tipoTrabajo,
              duracionEstimadaMin: act.duracionMinutos,
              origen: "PLAN",
            },
            { transaction: t }
          );
        }
      }

      /* =====================================
         🔴 CORRECTIVO → ACTIVIDADES MANUALES
         ✅ Nuevo: descripcion
         ✅ TipoTrabajo: REPARACION o CAMBIO (estricto)
      ===================================== */
      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Correctivo" &&
        target.equipoId
      ) {
        const manuales = tratamiento.actividadesManuales?.[target.equipoId] || [];

        if (!Array.isArray(manuales)) {
          throw new Error(`Actividades manuales inválidas para equipo ${target.equipoId}`);
        }

        for (const act of manuales) {
          if (!act.tarea) {
            throw new Error(`Actividad manual sin tarea para equipo ${target.equipoId}`);
          }

          // ✅ estricto: solo REPARACION o CAMBIO
          if (act.tipoTrabajo && !["REPARACION", "CAMBIO"].includes(act.tipoTrabajo)) {
            throw new Error(
              `TipoTrabajo inválido (solo REPARACION o CAMBIO) para equipo ${target.equipoId}`
            );
          }

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              sistema: act.sistema,
              subsistema: act.subsistema,
              componente: act.componente,
              tarea: act.tarea,

              // ✅ NUEVO
              descripcion: act.descripcion || null,

              // ✅ REPARACION o CAMBIO
              tipoTrabajo: act.tipoTrabajo || "REPARACION",

              // si estás usando los nuevos campos de duración:
              duracionEstimadaValor: act.duracionEstimadaValor ?? null,
              unidadDuracion: act.unidadDuracion || "min",
              duracionEstimadaMin: act.duracionEstimadaMin ?? null,

              observaciones: act.observaciones,
              origen: "MANUAL",
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
      const key = target.equipoId || target.ubicacionId;
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

    await t.commit();
    return nuevoTratamiento;
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
        model: TratamientoTrabajador,
        as: "trabajadores",
        include: [{ model: Trabajador, as: "trabajador" }],
      },
      {
        model: SolicitudCompra,
        as: "solicitudesCompra",
        include: [{ model: SolicitudCompraLinea, as: "lineas" }],
      },
      {
        model: TratamientoEquipo,
        as: "equipos", // ⚠️ debes crear esta asociación en Tratamiento
        include: [
          {
            model: Equipo,
            as: "equipo",
          },
          {
            model: TratamientoEquipoActividad,
            as: "actividades",
            include: [{ model: PlanMantenimientoActividad, as: "actividadPlan" }],
          },
          {
            model: PlanMantenimiento,
            as: "planMantenimiento",
          },
        ],
      },
    ],
  });
};


module.exports = {
  crearTratamiento,
  obtenerTratamientoPorAviso,
};
