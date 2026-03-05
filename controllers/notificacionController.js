const {
    Notificacion,
  NotificacionPlan,
  Adjunto,
  Trabajador,
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  Equipo,
  OrdenTrabajoEquipoActividad,
  PlanMantenimiento,
} = require("../db_connection");

// ===============================
// CREAR
// ===============================
const createNotificacionDB = async (data, transaction) => {
  return await Notificacion.create(data, { transaction });
};

// ===============================
// ASOCIAR TECNICOS
// ===============================
const setTecnicosDB = async (notificacion, tecnicos, transaction) => {
  return await notificacion.setTecnicos(tecnicos, { transaction });
};

// ===============================
// CREAR PLANES
// ===============================
const bulkCreatePlanesDB = async (planes, transaction) => {
  return await NotificacionPlan.bulkCreate(planes, { transaction });
};

// ===============================
// CREAR ADJUNTOS
// ===============================
const bulkCreateAdjuntosDB = async (adjuntos, transaction) => {
  return await Adjunto.bulkCreate(adjuntos, { transaction });
};

// ===============================
// OBTENER POR ID
// ===============================
const getNotificacionByIdDB = async (id) => {
  return await Notificacion.findByPk(id, {
    include: [
      { model: Trabajador, as: "tecnicos" },
      { model: NotificacionPlan, as: "planes" },
      { model: Adjunto, as: "adjuntos" },
      { model: OrdenTrabajoEquipo, as: "equipoOT" }, // 👈 nuevo
    ],
  });
};

// ===============================
// LISTAR
// ===============================
const getAllNotificacionesDB = async () => {
  return await Notificacion.findAll({
    order: [["createdAt", "DESC"]],
  });
};

// ===============================
// VALIDAR ACTA
// ===============================
const getActaAdjuntaDB = async (notificacionId) => {
  return await Adjunto.findOne({
    where: {
      notificacionId,
      categoria: "ACTA_CONFORMIDAD",
    },
  });
};

// ===============================
// CAMBIAR ESTADO
// ===============================
const updateEstadoNotificacionDB = async (id, estado) => {
  return await Notificacion.update({ estado }, { where: { id } });
};

// ===============================
// NUEVO: traer OT con equipos
// ===============================
const getOTConEquiposDB = async (ordenTrabajoId, transaction) => {
  return await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [
      {
        model: OrdenTrabajoEquipo,
        as: "equipos",
        attributes: ["id", "equipoId"],
      },
    ],
    transaction,
  });
};

// ===============================
// NUEVO: validar equipoOT pertenece a OT
// ===============================
const getEquipoOTDB = async ({ ordenTrabajoId, ordenTrabajoEquipoId, transaction }) => {
  return await OrdenTrabajoEquipo.findOne({
    where: { id: ordenTrabajoEquipoId, ordenTrabajoId },
    transaction,
  });
};

// ===============================
// NUEVO: buscar notificación por equipo OT
// ===============================
const getNotificacionByEquipoOTDB = async (ordenTrabajoEquipoId, transaction) => {
  return await Notificacion.findOne({
    where: { ordenTrabajoEquipoId },
    transaction,
  });
};

// ===============================
// NUEVO: precargar checklist planes según actividades del equipoOT
// ===============================
const precargarPlanesPorEquipoOTDB = async ({ notificacionId, ordenTrabajoEquipoId, transaction }) => {
  const acts = await OrdenTrabajoEquipoActividad.findAll({
    where: { ordenTrabajoEquipoId },
    attributes: ["id"],
    transaction,
  });

  if (!acts.length) return { creados: 0 };

  // tu modelo NotificacionPlan obliga estado, así que ponemos NO_APLICA por defecto
  const rows = acts.map((a) => ({
    notificacionId,
    ordenTrabajoActividadId: a.id,
    planMantenimientoId: null, // ✅ estable (no te rompe). Si luego quieres, lo llenas bien.
    estado: "NO_APLICA",
    comentario: null,
  }));

  await NotificacionPlan.bulkCreate(rows, { transaction });
  return { creados: rows.length };
};


const getNotificacionForPdfDB = async (id) => {
  return await Notificacion.findByPk(id, {
    include: [
      { model: OrdenTrabajo, as: "ordenTrabajo" },

      // 👇 equipo de la OT (tu FK ordenTrabajoEquipoId)
      {
        model: OrdenTrabajoEquipo,
        as: "equipoOT",
        include: [{ model: Equipo, as: "equipo" }],
      },

      { model: Trabajador, as: "tecnicos" },

      // 👇 actividades/checklist (NotificacionPlan -> actividad OT)
      {
        model: NotificacionPlan,
        as: "planes",
        include: [{ model: OrdenTrabajoEquipoActividad, as: "actividad" }],
      },

      // 👇 adjuntos (pero en PDF filtramos para usar SOLO fotos)
      { model: Adjunto, as: "adjuntos" },
    ],
  });
};

const getNotificacionesByOTDB = async (ordenTrabajoId) => {
  return await Notificacion.findAll({
    where: { ordenTrabajoId },
    include: [
      { model: Trabajador, as: "tecnicos" },
      { model: NotificacionPlan, as: "planes" },
      { model: Adjunto, as: "adjuntos" },
      {
        model: OrdenTrabajoEquipo,
        as: "equipoOT",
        include: [{ model: Equipo, as: "equipo" }],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

module.exports = {
  createNotificacionDB,
  setTecnicosDB,
  bulkCreatePlanesDB,
  bulkCreateAdjuntosDB,
  getNotificacionByIdDB,
  getAllNotificacionesDB,
  getActaAdjuntaDB,
  updateEstadoNotificacionDB,
  getOTConEquiposDB,
  getEquipoOTDB,
  getNotificacionByEquipoOTDB,
  precargarPlanesPorEquipoOTDB,
  getNotificacionForPdfDB,
  getNotificacionesByOTDB
};