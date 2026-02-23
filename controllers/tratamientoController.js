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
  Equipo

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

    if (!tratamiento) {
      throw new Error("Datos de tratamiento requeridos");
    }

    if (!tratamiento.contratista) {
      throw new Error("El contratista es obligatorio");
    }

    if (
      !Array.isArray(tratamiento.requerimientos) ||
      tratamiento.requerimientos.length === 0
    ) {
      throw new Error("Debe agregar al menos un requerimiento");
    }

    for (const [i, req] of tratamiento.requerimientos.entries()) {
      if (!req.rol) {
        throw new Error(`Requerimiento ${i + 1}: rol obligatorio`);
      }

      if (!req.cantidad || req.cantidad <= 0) {
        throw new Error(
          `Requerimiento ${i + 1}: cantidad debe ser mayor a 0`
        );
      }
    }

    if (!solicitudGeneral) {
      throw new Error("Debe enviar la solicitud general");
    }

    /* ===============================
       VALIDAR QUE NO EXISTA
    =============================== */

    const existe = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (existe) {
      throw new Error("Este aviso ya tiene un tratamiento registrado");
    }

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

    if (!aviso) {
      throw new Error("Aviso no encontrado");
    }

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

    /* ===============================
       1️⃣ CREAR TRATAMIENTO
    =============================== */

    const nuevoTratamiento = await Tratamiento.create(
      {
        aviso_id: avisoId,
        contratista: tratamiento.contratista,
        requerimientos: tratamiento.requerimientos.map((r) => ({
          rol: r.rol,
          label: r.label,
          cantidad: r.cantidad,
        })),
        creado_por: usuarioId,
        estado: "CON_SOLICITUD",
      },
      { transaction: t }
    );

    /* ===============================
       2️⃣ ASIGNAR TRABAJADORES
    =============================== */

    for (const req of tratamiento.requerimientos) {
      const seleccionados = Array.isArray(req.personas)
        ? req.personas.map((p) =>
            typeof p === "string" ? p : p.id
          )
        : [];

      // manuales
      for (const trabajadorId of seleccionados) {
        await TratamientoTrabajador.create(
          {
            tratamiento_id: nuevoTratamiento.id,
            trabajador_id: trabajadorId,
            rol: req.rol,
          },
          { transaction: t }
        );
      }

      // completar faltantes
      const faltantes = req.cantidad - seleccionados.length;

      if (faltantes > 0) {
        const randoms = await Trabajador.findAll({
          where: {
            rol: req.rol,
            activo: true,
            ...(seleccionados.length && {
              id: { [Op.notIn]: seleccionados },
            }),
          },
          order: sequelize.random(),
          limit: faltantes,
          transaction: t,
        });

        await TratamientoTrabajador.bulkCreate(
          randoms.map((trab) => ({
            tratamiento_id: nuevoTratamiento.id,
            trabajador_id: trab.id,
            rol: req.rol,
          })),
          { transaction: t }
        );
      }
    }

    /* ===============================
       3️⃣ CREAR TRATAMIENTO_EQUIPOS
    =============================== */

    for (const target of targets) {
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
      ===================================== */

      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Preventivo" &&
        target.equipoId
      ) {
        const planIdSeleccionado =
          tratamiento.planesSeleccionados?.[target.equipoId];

        if (!planIdSeleccionado) {
          throw new Error(
            `Debe seleccionar un plan para el equipo ${target.equipoId}`
          );
        }

        const plan = await PlanMantenimiento.findByPk(
          planIdSeleccionado,
          {
            include: [{ association: "actividades" }],
            transaction: t,
          }
        );

        if (!plan) {
          throw new Error(
            `Plan no válido para el equipo ${target.equipoId}`
          );
        }

        await te.update(
          { planMantenimientoId: plan.id },
          { transaction: t }
        );

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
      ===================================== */

      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Correctivo" &&
        target.equipoId
      ) {
        const manuales =
          tratamiento.actividadesManuales?.[target.equipoId] || [];

        if (!Array.isArray(manuales)) {
          throw new Error(
            `Actividades manuales inválidas para equipo ${target.equipoId}`
          );
        }

        for (const act of manuales) {
          if (!act.tarea) {
            throw new Error(
              `Actividad manual sin tarea para equipo ${target.equipoId}`
            );
          }

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              sistema: act.sistema,
              subsistema: act.subsistema,
              componente: act.componente,
              tarea: act.tarea,
              tipoTrabajo: act.tipoTrabajo,
              duracionEstimadaMin: act.duracionEstimadaMin,
              observaciones: act.observaciones,
              origen: "MANUAL",
            },
            { transaction: t }
          );
        }
      }
    }

    /* ===============================
       4️⃣ SOLICITUD GENERAL
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
      })),
      { transaction: t }
    );

    /* ===============================
       5️⃣ SOLICITUDES POR TARGET
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
        })),
        { transaction: t }
      );
    }

    /* ===============================
       6️⃣ ACTUALIZAR AVISO
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
        include: [
          {
            model: Trabajador,
            as: "trabajador",
          },
        ],
      },
      {
        model: SolicitudCompra,
        as: "solicitudCompra",
        include: [
          {
            model: SolicitudCompraLinea,
            as: "lineas",
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
