const avisosController = require("../controllers/avisosController");

async function crearAvisoHandler(req, res) {
  const errors = [];

  try {
    if (!req.user?.id) {
      errors.push("Usuario no autenticado");
    }

    if (!req.body.tipoAviso) {
      errors.push("tipoAviso es obligatorio");
    }

    if (!req.body.numeroAviso) {
      errors.push("numeroAviso es obligatorio");
    }

    if (!req.body.cliente) {
      errors.push("cliente es obligatorio");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const aviso = await avisosController.crearAviso(
      req.body,
      req.user.id
    );

    res.status(201).json(aviso);
  } catch (error) {
    console.error("ERROR CREAR AVISO:", error);

    errors.push("Error interno al crear el aviso");

    res.status(500).json({
      errors,
      detalle: error.message,
    });
  }
}
async function obtenerAvisosHandler(req, res) {
  try {
    const avisos = await avisosController.obtenerAvisos();
    res.json(avisos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener avisos" });
  }
}

async function obtenerAvisoPorIdHandler(req, res) {
  try {
    const aviso = await avisosController.obtenerAvisoPorId(
      req.params.id
    );

    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json(aviso);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener aviso" });
  }
}

async function actualizarAvisoHandler(req, res) {
  try {
    const aviso = await avisosController.actualizarAviso(
      req.params.id,
      req.body
    );

    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json(aviso);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar aviso" });
  }
}

async function eliminarAvisoHandler(req, res) {
  try {
    const eliminado = await avisosController.eliminarAviso(
      req.params.id
    );

    if (!eliminado) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json({ message: "Aviso eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar aviso" });
  }
}

module.exports = {
  crearAvisoHandler,
  obtenerAvisosHandler,
  obtenerAvisoPorIdHandler,
  actualizarAvisoHandler,
  eliminarAvisoHandler,
};
