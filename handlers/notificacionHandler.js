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

  // nuevos
  getEquipoOTDB,
  getNotificacionByEquipoOTDB,
  precargarPlanesPorEquipoOTDB,
  getOTConEquiposDB,
  getNotificacionForPdfDB,
  getNotificacionesByOTDB // ✅ si vas a generar por OT
} = require("../controllers/notificacionController");

const { renderNotificacionPdfBuffer } = require("../services/notificacionPdfService");


/* =====================================
   CREAR NOTIFICACION (1 por equipo OT)
===================================== */
const crearNotificacion = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      fechaInicio,
      fechaFin,
      estadoGeneralEquipo,
      ordenTrabajoId,
      ordenTrabajoEquipoId,
      tecnicos,
      planes,
      adjuntos,
      precargarPlanes = true,
      ...resto
    } = req.body;

    if (!fechaInicio || !fechaFin) {
      await transaction.rollback();
      return res.status(400).json({ message: "Fechas obligatorias" });
    }
    if (!estadoGeneralEquipo) {
      await transaction.rollback();
      return res.status(400).json({ message: "Estado general requerido" });
    }
    if (!ordenTrabajoId) {
      await transaction.rollback();
      return res.status(400).json({ message: "Orden de trabajo requerida" });
    }
    if (!ordenTrabajoEquipoId) {
      await transaction.rollback();
      return res.status(400).json({
        message: "ordenTrabajoEquipoId es requerido (1 notificación por equipo)",
      });
    }

    // validar equipo pertenece a OT
    const equipoOT = await getEquipoOTDB({
      ordenTrabajoId,
      ordenTrabajoEquipoId,
      transaction,
    });
    if (!equipoOT) {
      await transaction.rollback();
      return res.status(400).json({ message: "El equipo no pertenece a la OT" });
    }

    // evitar duplicado
    const existe = await getNotificacionByEquipoOTDB(
      ordenTrabajoEquipoId,
      transaction
    );
    if (existe) {
      await transaction.rollback();
      return res.status(409).json({
        message: "Ya existe notificación para este equipo de la OT",
        notificacionId: existe.id,
      });
    }

    // 1) crear notificación
    const notificacion = await createNotificacionDB(
      {
        fechaInicio,
        fechaFin,
        estadoGeneralEquipo,
        ordenTrabajoId,
        ordenTrabajoEquipoId,
        ...resto,
      },
      transaction
    );

    // 2) técnicos
    if (tecnicos?.length) {
      await setTecnicosDB(notificacion, tecnicos, transaction);
    }

    // 3) planes
    if (planes?.length) {
  const planesValidos = planes.filter((p) => p.ordenTrabajoActividadId && p.estado);

  if (planesValidos.length > 0) {
    const planesData = planesValidos.map((p) => ({
      notificacionId: notificacion.id,
      ordenTrabajoActividadId: p.ordenTrabajoActividadId,
      planMantenimientoId: null, // ✅ NO GUARDES lo que venga del front (evita FK)
      estado: p.estado,
      comentario: p.comentario ?? null,
      trabajadorId: p.trabajadorId ?? null, 
    }));

    await bulkCreatePlanesDB(planesData, transaction);
  }
} else if (precargarPlanes) {
  await precargarPlanesPorEquipoOTDB({
    notificacionId: notificacion.id,
    ordenTrabajoEquipoId,
    transaction,
  });
}
    // 4) adjuntos
    if (adjuntos?.length) {
      const adjuntosData = adjuntos.map((a) => ({
        ...a,
        notificacionId: notificacion.id,
      }));
      await bulkCreateAdjuntosDB(adjuntosData, transaction);
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Notificación creada correctamente (por equipo)",
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

/* =====================================
   OBTENER POR ID
===================================== */
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

/* =====================================
   LISTAR
===================================== */
const listarNotificaciones = async (req, res) => {
  try {
    const data = await getAllNotificacionesDB();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =====================================
   FINALIZAR (requiere Acta)
===================================== */
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

    return res.json({ message: "Notificación finalizada" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* =====================================
   (OPCIONAL) GENERAR POR OT (1 por equipo)
   POST /notificaciones/ots/:ordenTrabajoId/generar
===================================== */
const generarNotificacionesPorOT = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ordenTrabajoId } = req.params;

    const { fechaInicio, fechaFin, estadoGeneralEquipo, precargarPlanes = true, ...resto } = req.body || {};

    if (!fechaInicio || !fechaFin) {
      await transaction.rollback();
      return res.status(400).json({ message: "Fechas obligatorias" });
    }
    if (!estadoGeneralEquipo) {
      await transaction.rollback();
      return res.status(400).json({ message: "Estado general requerido" });
    }

    const ot = await getOTConEquiposDB(ordenTrabajoId, transaction);
    if (!ot) {
      await transaction.rollback();
      return res.status(404).json({ message: "OT no encontrada" });
    }

    const equiposOT = ot.equipos || [];
    if (equiposOT.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "La OT no tiene equipos" });
    }

    const creadas = [];
    const existentes = [];

    for (const eq of equiposOT) {
      const ya = await getNotificacionByEquipoOTDB(eq.id, transaction);
      if (ya) {
        existentes.push({ ordenTrabajoEquipoId: eq.id, notificacionId: ya.id });
        continue;
      }

      const n = await createNotificacionDB(
        {
          ordenTrabajoId,
          ordenTrabajoEquipoId: eq.id,
          fechaInicio,
          fechaFin,
          estadoGeneralEquipo,
          ...resto,
        },
        transaction
      );

      if (precargarPlanes) {
        await precargarPlanesPorEquipoOTDB({
          notificacionId: n.id,
          ordenTrabajoEquipoId: eq.id,
          transaction,
        });
      }

      creadas.push(n);
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Notificaciones generadas (1 por equipo)",
      resumen: { totalEquipos: equiposOT.length, creadas: creadas.length, existentes: existentes.length },
      creadas,
      existentes,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ message: "Error al generar notificaciones", error: error.message });
  }
};

const generarPdfNotificacion = async (req, res) => {
  try {
    const { id } = req.params;

    const notif = await getNotificacionForPdfDB(id);
    if (!notif) return res.status(404).json({ message: "Notificación no encontrada" });

    const pdfBuffer = await renderNotificacionPdfBuffer(notif);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=notificacion_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("ERROR PDF:", error);
    return res.status(500).json({ message: "Error al generar PDF", error: error.message });
  }
};


const listarNotificacionesPorOT = async (req, res) => {
  try {
    const { ordenTrabajoId } = req.params;
    const data = await getNotificacionesByOTDB(ordenTrabajoId);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Error al listar por OT", error: error.message });
  }
};
module.exports = {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
  generarNotificacionesPorOT, 
  generarPdfNotificacion,
  listarNotificacionesPorOT, 
};