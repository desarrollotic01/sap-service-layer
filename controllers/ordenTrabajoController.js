const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  AvisoEquipo,
  Aviso,
  sequelize,
  Adjunto,
  OrdenTrabajoEquipoTrabajador,
  OrdenTrabajoEquipoActividad,
  PlanMantenimientoActividad,
  Tratamiento, SolicitudCompra
} = require("../db_connection");

const { Op } = require("sequelize");



async function asignarSolicitudesDeTratamientoAOT({ avisoId, otId, equipoIdsOT, t }) {
  // buscar tratamiento por aviso
  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
    transaction: t,
  });
  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  // 1) Asignar solicitud GENERAL (solo a esta OT)
  const general = await SolicitudCompra.findOne({
    where: {
      tratamiento_id: tratamiento.id,
      esGeneral: true,
    },
    transaction: t,
  });

  if (general) {
    // si ya está asignada a una OT, NO la reasignamos
    // (para que no se "duplique" si creas varias OTs)
    if (!general.ordenTrabajoId) {
      await general.update({ ordenTrabajoId: otId }, { transaction: t });
    }
  }

  // 2) Asignar solicitudes INDIVIDUALES de los equipos de esta OT
  await SolicitudCompra.update(
    { ordenTrabajoId: otId },
    {
      where: {
        tratamiento_id: tratamiento.id,
        esGeneral: false,
        equipo_id: { [Op.in]: equipoIdsOT },
      },
      transaction: t,
    }
  );
}
// ✅ PREVENTIVO
async function generarActividadesPreventivas(ot, equiposOT, t) {
  if (ot.tipoMantenimiento !== "Preventivo") return;

  const planIds = [
    ...new Set(equiposOT.map((e) => e.planMantenimientoId).filter(Boolean)),
  ];
  if (!planIds.length) return;

  const actividadesPlan = await PlanMantenimientoActividad.findAll({
    where: { planMantenimientoId: { [Op.in]: planIds } },
    transaction: t,
  });

  const actividadesPorPlan = {};
  for (const act of actividadesPlan) {
    if (!actividadesPorPlan[act.planMantenimientoId]) {
      actividadesPorPlan[act.planMantenimientoId] = [];
    }
    actividadesPorPlan[act.planMantenimientoId].push(act);
  }

  const actividadesCrear = [];

  for (const equipoOT of equiposOT) {
    const actsPlan = actividadesPorPlan[equipoOT.planMantenimientoId] || [];
    for (const act of actsPlan) {
      actividadesCrear.push({
        ordenTrabajoEquipoId: equipoOT.id,
        planMantenimientoActividadId: act.id,
        sistema: act.sistema || null,
        subsistema: act.subsistema || null,
        componente: act.componente || null,
        tarea: act.tarea,
        tipoTrabajo: act.tipoTrabajo || null,

        // ⚠️ aquí aún estás usando solo minutos
        duracionEstimadaMin: act.duracionMinutos ?? null,

        estado: "PENDIENTE",
        origen: "PLAN",
      });
    }
  }

  if (actividadesCrear.length > 0) {
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, {
      transaction: t,
    });
  }
}

// ✅ CORRECTIVO (manual desde request)
async function generarActividadesCorrectivas(ot, equiposOT, equiposData, t) {
  if (ot.tipoMantenimiento !== "Correctivo") return;

  const actividadesCrear = [];

  equiposOT.forEach((equipoOT, index) => {
    const actividades = equiposData[index]?.actividades || [];

    actividades.forEach((act) => {
      actividadesCrear.push({
        ordenTrabajoEquipoId: equipoOT.id,
        planMantenimientoActividadId: null,
        sistema: act.sistema || null,
        subsistema: act.subsistema || null,
        componente: act.componente || null,
        tarea: act.tarea || null,
        tipoTrabajo: act.tipoTrabajo || "REVISION",
        duracionEstimadaMin: act.duracionEstimadaMin
          ? parseInt(act.duracionEstimadaMin)
          : null,
        estado: "PENDIENTE",
        origen: "MANUAL",
        observaciones: act.observaciones || null,
      });
    });
  });

  if (actividadesCrear.length > 0) {
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, {
      transaction: t,
    });
  }
}

// helper: valida que equipos pertenezcan al aviso
async function validarEquiposDelAviso(avisoId, equipos, t) {
  const equiposAviso = await AvisoEquipo.findAll({
    where: {
      avisoId,
      equipoId: equipos.map((e) => e.equipoId),
    },
    transaction: t,
  });

  if (equiposAviso.length !== equipos.length) {
    throw new Error("Uno o más equipos no pertenecen al aviso");
  }
}

async function crearOTInterna({ aviso, otDataBase, equipos, adjuntos }, t) {
  const countOT = await OrdenTrabajo.count({
    where: { avisoId: aviso.id },
    transaction: t,
  });

  const correlativo = String(countOT + 1).padStart(3, "0");

  const otData = {
    ...otDataBase,
    avisoId: aviso.id,
    numeroOT: `${aviso.numeroAviso}-OT${correlativo}`,
  };

  // 1) crear OT
  const ot = await OrdenTrabajo.create(otData, { transaction: t });

  // 2) crear equipos OT
  const equiposOT = await OrdenTrabajoEquipo.bulkCreate(
    equipos.map((e) => {
      let planId = e.planMantenimientoId || null;

      if (aviso.tipoAviso === "instalacion") planId = null;

      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Preventivo"
      ) {
        if (!planId) {
          throw new Error("Para mantenimiento preventivo debe seleccionar un plan");
        }
      }

      return {
        ordenTrabajoId: ot.id,
        equipoId: e.equipoId,
        descripcionEquipo: e.descripcionEquipo || null,
        prioridad: e.prioridad || "MEDIA",
        planMantenimientoId: planId,
        fechaInicioProgramada: e.fechaInicioProgramada || null,
        fechaFinProgramada: e.fechaFinProgramada || null,
        observacionesEquipo: e.observacionesEquipo || null,
      };
    }),
    { transaction: t, returning: true }
  );

  // 3) ✅ asignar solicitudes de compra del tratamiento a esta OT
  await asignarSolicitudesDeTratamientoAOT({
    avisoId: aviso.id,
    otId: ot.id,
    equipoIdsOT: equiposOT.map((x) => x.equipoId),
    t,
  });

  // 4) generar actividades
  await generarActividadesPreventivas(ot, equiposOT, t);
  await generarActividadesCorrectivas(ot, equiposOT, equipos, t);

  // 5) trabajadores por equipo
  const trabajadoresEquipo = [];
  equiposOT.forEach((equipoCreado, index) => {
    const trabajadores = equipos[index].trabajadores || [];
    trabajadores.forEach((trab) => {
      trabajadoresEquipo.push({
        ordenTrabajoEquipoId: equipoCreado.id,
        trabajadorId: trab.trabajadorId,
        esEncargado: trab.esEncargado || false,
      });
    });
  });

  if (trabajadoresEquipo.length > 0) {
    await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresEquipo, {
      transaction: t,
    });
  }

  // 6) adjuntos OT
  if (adjuntos && adjuntos.length > 0) {
    await Adjunto.bulkCreate(
      adjuntos.map((a) => ({
        nombre: a.nombre,
        url: a.url,
        tipo: a.tipo,
        ordenTrabajoId: ot.id,
      })),
      { transaction: t }
    );
  }

  return ot;
}

async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const {
      equipos,
      adjuntos = [],
      modo = "GRUPAL", // GRUPAL | INDIVIDUAL | MIXTO
      grupalEquipoIds = [],
      individualEquipoIds = [],
      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");

    if (!Array.isArray(equipos) || equipos.length === 0) {
      throw new Error("Debe enviar al menos un equipo");
    }

    // 1) obtener aviso
    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    // 2) heredar tipo mantenimiento
    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento) {
        throw new Error("El aviso de mantenimiento no tiene tipo de mantenimiento");
      }
      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      otData.tipoMantenimiento = null;
    }

    // 3) validar equipos del aviso (sobre todos los que vienen en payload)
    await validarEquiposDelAviso(aviso.id, equipos, t);

    // 4) crear según modo
    const otsCreadas = [];

    if (modo === "GRUPAL") {
      const ot = await crearOTInterna(
        { aviso, otDataBase: otData, equipos, adjuntos },
        t
      );
      otsCreadas.push(ot);
    }

    if (modo === "INDIVIDUAL") {
      for (const e of equipos) {
        const ot = await crearOTInterna(
          { aviso, otDataBase: otData, equipos: [e], adjuntos },
          t
        );
        otsCreadas.push(ot);
      }
    }

    if (modo === "MIXTO") {
      if (!Array.isArray(grupalEquipoIds) || grupalEquipoIds.length === 0) {
        throw new Error("En MIXTO debe enviar grupalEquipoIds");
      }
      if (!Array.isArray(individualEquipoIds) || individualEquipoIds.length === 0) {
        throw new Error("En MIXTO debe enviar individualEquipoIds");
      }

      // validar sin duplicados
      const set = new Set([...grupalEquipoIds, ...individualEquipoIds]);
      if (set.size !== grupalEquipoIds.length + individualEquipoIds.length) {
        throw new Error("Un equipo no puede estar en grupal e individual a la vez");
      }

      // validar que existan en equipos payload
      const idsPayload = new Set(equipos.map((x) => x.equipoId));
      for (const id of [...grupalEquipoIds, ...individualEquipoIds]) {
        if (!idsPayload.has(id)) {
          throw new Error(`El equipo ${id} no fue enviado en el payload`);
        }
      }

      const equiposGrupal = equipos.filter((e) => grupalEquipoIds.includes(e.equipoId));
      const equiposIndividual = equipos.filter((e) =>
        individualEquipoIds.includes(e.equipoId)
      );

      // 1 OT grupal
      const otGrupal = await crearOTInterna(
        { aviso, otDataBase: otData, equipos: equiposGrupal, adjuntos },
        t
      );
      otsCreadas.push(otGrupal);

      // OTs individuales
      for (const e of equiposIndividual) {
        const ot = await crearOTInterna(
          { aviso, otDataBase: otData, equipos: [e], adjuntos },
          t
        );
        otsCreadas.push(ot);
      }
    }

    if (!["GRUPAL", "INDIVIDUAL", "MIXTO"].includes(modo)) {
      throw new Error("modo inválido. Use GRUPAL | INDIVIDUAL | MIXTO");
    }

    // 5) estado aviso
    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });

    await t.commit();

    // devolver todas las OTs creadas completas
    return await OrdenTrabajo.findAll({
      where: { id: { [Op.in]: otsCreadas.map((x) => x.id) } },
      include: [
        {
          association: "equipos",
          include: [
            { association: "equipo" },
            { association: "planMantenimiento" },
            { association: "actividades" },
            { association: "trabajadores", include: ["trabajador"] },
          ],
        },
         { association: "solicitudesCompra" },
        { association: "adjuntos" },
      ],
      order: [["createdAt", "DESC"]],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function obtenerOrdenesTrabajo() {
  return await OrdenTrabajo.findAll({
    include: [
      {
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "adjuntos" },
          { association: "trabajadores", include: ["trabajador"] },
          { association: "actividades" },
        ],
      },
      { association: "adjuntos" },
    ],
  });
}

async function obtenerOrdenTrabajoPorId(id) {
  return await OrdenTrabajo.findByPk(id, {
    include: [
      {
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "planMantenimiento" },
          { association: "actividades" },
          { association: "trabajadores", include: ["trabajador"] },
        ],
      },
      { association: "adjuntos" },
    ],
  });
}

async function actualizarOrdenTrabajo(id, data) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;
  await ot.update(data);
  return ot;
}

async function eliminarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;

  await Adjunto.destroy({ where: { ordenTrabajoId: id } });
  await OrdenTrabajoEquipo.destroy({ where: { ordenTrabajoId: id } });
  await ot.destroy();

  return true;
}

async function liberarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);

  if (!ot) throw new Error("Orden de Trabajo no encontrada");
  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede liberar una OT en estado CREADO");
  }

  await ot.update({ estado: "LIBERADO" });
  return ot;
}

module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajo,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo,
};