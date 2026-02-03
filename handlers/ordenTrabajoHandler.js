const ordenTrabajoController = require("../controllers/ordenTrabajoController");

/* =========================
   CREAR OT
========================= */
async function crearOrdenTrabajoHandler(req, res) {
  try {
    const errors = [];

    if (!req.body.numeroOT) {
      errors.push("numeroOT es requerido");
    }

    if (!req.body.avisoId) {
      errors.push("avisoId es requerido");
    }

    if (!req.body.tratamientoId) {
      errors.push("tratamientoId es requerido");
    }

    if (!req.body.equipos || !Array.isArray(req.body.equipos)) {
      errors.push("equipos debe ser un arreglo");
    }

    if (req.body.equipos && req.body.equipos.length === 0) {
      errors.push("Debe incluir al menos un equipo");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const ot = await ordenTrabajoController.crearOrdenTrabajo(req.body);

    return res.status(201).json(ot);

  } catch (error) {
    console.error("ERROR CREAR OT:", error);

    return res.status(500).json({
      errors: ["Error interno al crear la OT"],
    });
  }
}

/* =========================
   GET TODOS
========================= */
async function obtenerOrdenesTrabajoHandler(req, res) {
  try {
    const ots = await ordenTrabajoController.obtenerOrdenesTrabajo();
    res.json(ots);
  } catch (error) {
    console.error("ERROR GET OTS:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================
   GET POR ID
========================= */
async function obtenerOrdenTrabajoPorIdHandler(req, res) {
  try {
    const ot = await ordenTrabajoController.obtenerOrdenTrabajoPorId(
      req.params.id
    );

    if (!ot) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json(ot);
  } catch (error) {
    console.error("ERROR GET OT:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================
   UPDATE
========================= */
async function actualizarOrdenTrabajoHandler(req, res) {
  try {
    const ot = await ordenTrabajoController.actualizarOrdenTrabajo(
      req.params.id,
      req.body
    );

    if (!ot) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json(ot);
  } catch (error) {
    console.error("ERROR UPDATE OT:", error);
    res.status(500).json({ message: "Error al actualizar OT" });
  }
}

/* =========================
   DELETE
========================= */
async function eliminarOrdenTrabajoHandler(req, res) {
  try {
    const eliminado = await ordenTrabajoController.eliminarOrdenTrabajo(
      req.params.id
    );

    if (!eliminado) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json({ message: "OT eliminada correctamente" });
  } catch (error) {
    console.error("ERROR DELETE OT:", error);
    res.status(500).json({ message: "Error al eliminar OT" });
  }
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  crearOrdenTrabajoHandler,
  obtenerOrdenesTrabajoHandler,
  obtenerOrdenTrabajoPorIdHandler,
  actualizarOrdenTrabajoHandler,
  eliminarOrdenTrabajoHandler,
};
