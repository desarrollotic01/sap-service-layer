const {
  Notificacion,
  NotificacionPlan,
  Adjunto,
  Trabajador,
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
  return await Notificacion.update(
    { estado },
    { where: { id } }
  );
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
};
