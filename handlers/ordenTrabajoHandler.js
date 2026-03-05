const ordenTrabajoController = require("../controllers/ordenTrabajoController");

/* =========================
   CREAR OT
========================= */
async function crearOrdenTrabajoHandler(req, res) {
  try {
    const errors = [];

    const {
      avisoId,
      equipos,
      modo = "GRUPAL", // GRUPAL | INDIVIDUAL | MIXTO
      grupalEquipoIds = [],
      individualEquipoIds = [],
      solicitudGeneralStrategy = "OT_GRUPAL", // NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA
      otKeyGeneral = null,
    } = req.body || {};

    // ✅ avisoId
    if (!avisoId) errors.push("avisoId es requerido");

    // ✅ equipos
    if (!equipos || !Array.isArray(equipos)) errors.push("equipos debe ser un arreglo");
    if (Array.isArray(equipos) && equipos.length === 0) errors.push("Debe incluir al menos un equipo");

    // ✅ modo
    if (modo && !["GRUPAL", "INDIVIDUAL", "MIXTO"].includes(modo)) {
      errors.push("modo inválido. Use GRUPAL | INDIVIDUAL | MIXTO");
    }

    // ✅ estrategia solicitud general
    if (
      solicitudGeneralStrategy &&
      !["NINGUNA", "OT_GRUPAL", "PRIMERA_OT", "OT_ESPECIFICA"].includes(solicitudGeneralStrategy)
    ) {
      errors.push("solicitudGeneralStrategy inválida. Use NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA");
    }

    if (solicitudGeneralStrategy === "OT_ESPECIFICA") {
      if (!otKeyGeneral) {
        errors.push("otKeyGeneral es requerido cuando solicitudGeneralStrategy=OT_ESPECIFICA");
      } else {
        // debe ser "GRUPAL" o "E:<id>"
        const ok = otKeyGeneral === "GRUPAL" || /^E:\d+$/.test(String(otKeyGeneral));
        if (!ok) errors.push('otKeyGeneral inválido. Use "GRUPAL" o "E:<equipoId>" (ej: E:15)');
      }
    }

    // ✅ MIXTO: arreglos obligatorios y sin cruces (validación base)
    if (modo === "MIXTO") {
      if (!Array.isArray(grupalEquipoIds) || grupalEquipoIds.length === 0) {
        errors.push("En MIXTO debe enviar grupalEquipoIds (arreglo con ids)");
      }
      if (!Array.isArray(individualEquipoIds) || individualEquipoIds.length === 0) {
        errors.push("En MIXTO debe enviar individualEquipoIds (arreglo con ids)");
      }

      if (Array.isArray(grupalEquipoIds) && Array.isArray(individualEquipoIds)) {
        const set = new Set([...grupalEquipoIds, ...individualEquipoIds]);
        if (set.size !== grupalEquipoIds.length + individualEquipoIds.length) {
          errors.push("Un equipo no puede estar en grupal e individual a la vez");
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const ots = await ordenTrabajoController.crearOrdenTrabajo(req.body);

    return res.status(201).json(ots);
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
    const ot = await ordenTrabajoController.obtenerOrdenTrabajoPorId(req.params.id);

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
    const ot = await ordenTrabajoController.actualizarOrdenTrabajo(req.params.id, req.body);

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
    const eliminado = await ordenTrabajoController.eliminarOrdenTrabajo(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json({ message: "OT eliminada correctamente" });
  } catch (error) {
    console.error("ERROR DELETE OT:", error);
    res.status(500).json({ message: "Error al eliminar OT" });
  }
}

const liberarOrdenTrabajo = async (req, res) => {
  try {
    const { id } = req.params;

    const ot = await ordenTrabajoController.liberarOrdenTrabajo(id);

    res.json({
      message: "Orden de Trabajo liberada correctamente",
      data: ot,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

/* =========================
   EXPORTS
========================= */
module.exports = {
  crearOrdenTrabajoHandler,
  obtenerOrdenesTrabajoHandler,
  obtenerOrdenTrabajoPorIdHandler,
  actualizarOrdenTrabajoHandler,
  eliminarOrdenTrabajoHandler,
  liberarOrdenTrabajo,
};