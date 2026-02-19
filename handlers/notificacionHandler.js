const { sequelize } = require("../db_connection");

const {
  createNotificacionDB,
  setTecnicosDB,
  bulkCreatePlanesDB,
  bulkCreateAdjuntosDB,
  getNotificacionByIdDB,
  getAllNotificacionesDB,
  getActaAdjuntaDB,
  updateEstadoNotificacionDB,
} = require("../controllers/notificacionController");

// =====================================
// CREAR NOTIFICACION
// =====================================
const crearNotificacion = async (req, res) => {

  const transaction = await sequelize.transaction();

  try {
    const {
      fechaInicio,
      fechaFin,
      estadoGeneralEquipo,
      ordenTrabajoId,
      tecnicos,
      planes,
      adjuntos,
      ...resto
    } = req.body;

    // 🔥 VALIDACIONES BÁSICAS
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: "Fechas obligatorias" });
    }

    if (!estadoGeneralEquipo) {
      return res.status(400).json({ message: "Estado general requerido" });
    }

    if (!ordenTrabajoId) {
      return res.status(400).json({ message: "Orden de trabajo requerida" });
    }

    // 1️⃣ Crear notificación
    const notificacion = await createNotificacionDB(
      {
        fechaInicio,
        fechaFin,
        estadoGeneralEquipo,
        ordenTrabajoId,
        ...resto,
      },
      transaction
    );

    // 2️⃣ Técnicos
    if (tecnicos?.length) {
      await setTecnicosDB(notificacion, tecnicos, transaction);
    }

// 3️⃣ Planes
if (planes?.length) {
  const planesValidos = planes.filter(
    (p) => p.ordenTrabajoActividadId
  );

  if (planesValidos.length > 0) {
    const planesData = planesValidos.map((p) => ({
      notificacionId: notificacion.id,
      ordenTrabajoActividadId: p.ordenTrabajoActividadId ?? null,
      planMantenimientoId: p.planMantenimientoId, // ← ya seguro
      estado: p.estado,
      comentario: p.comentario ?? null,
    }));

    await bulkCreatePlanesDB(planesData, transaction);
  }
}


    // 4️⃣ Adjuntos
    if (adjuntos?.length) {
      const adjuntosData = adjuntos.map((a) => ({
        ...a,
        notificacionId: notificacion.id,
      }));

      await bulkCreateAdjuntosDB(adjuntosData, transaction);
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Notificación creada correctamente",
      data: notificacion,
    });

  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Error al crear",
      error: error.message,
    });
  }
};

// =====================================
// OBTENER POR ID
// =====================================
const obtenerNotificacion = async (req, res) => {
  try {
    const { id } = req.params;

    const notificacion = await getNotificacionByIdDB(id);

    if (!notificacion) {
      return res.status(404).json({ message: "No encontrada" });
    }

    return res.json(notificacion);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =====================================
// LISTAR
// =====================================
const listarNotificaciones = async (req, res) => {
  try {
    const data = await getAllNotificacionesDB();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =====================================
// FINALIZAR
// =====================================
const finalizarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;

    const acta = await getActaAdjuntaDB(id);

    if (!acta) {
      return res.status(400).json({
        message: "Debe adjuntar Acta de Conformidad",
      });
    }

    await updateEstadoNotificacionDB(id, "FINALIZADO");

    return res.json({
      message: "Notificación finalizada",
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
};
