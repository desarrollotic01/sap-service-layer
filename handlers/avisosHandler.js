const avisosController = require("../controllers/avisosController");
const { validarAviso } = require("../validators/avisoValidator");



async function crearAvisoHandler(req, res) {
  try {
    const errors = [];

    if (!req.user?.id) {
      errors.push("Usuario no autenticado");
    }

    errors.push(...validarAviso(req.body));

    const { equipos = [], ubicaciones = [] } = req.body;

    // Validar tipo arreglo
    if (equipos && !Array.isArray(equipos)) {
      errors.push("Equipos debe ser un arreglo");
    }

    if (ubicaciones && !Array.isArray(ubicaciones)) {
      errors.push("Ubicaciones debe ser un arreglo");
    }

    const tieneEquipos = Array.isArray(equipos) && equipos.length > 0;
    const tieneUbicaciones =
      Array.isArray(ubicaciones) && ubicaciones.length > 0;

    // 🔥 VALIDACIÓN EXCLUSIVA (XOR)
    if (!tieneEquipos && !tieneUbicaciones) {
      errors.push(
        "Debe enviar equipos o ubicaciones técnicas"
      );
    }

    if (tieneEquipos && tieneUbicaciones) {
      errors.push(
        "El aviso no puede tener equipos y ubicaciones al mismo tiempo"
      );
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const aviso = await avisosController.crearAviso(
      req.body,
      req.user.id
    );

    return res.status(201).json(aviso);
  } catch (error) {
    console.error("ERROR CREAR AVISO:", error);

    return res.status(500).json({
      errors: ["Error interno al crear el aviso"],
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

async function actualizarEstadoAvisoHandler(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const aviso = await avisosController.actualizarEstadoAviso(id, estado);

    res.json(aviso);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar estado" });
  }
}
module.exports = {
  crearAvisoHandler,
  obtenerAvisosHandler,
  obtenerAvisoPorIdHandler,
  actualizarAvisoHandler,
  eliminarAvisoHandler,
  actualizarEstadoAvisoHandler,
};
