const EquipoController = require("../controllers/equipoController");
const { Adjunto, Equipo } = require("../db_connection");


const crearEquipo = async (req, res) => {
  try {
    const result = await EquipoController.crear(req.body, req.files || []);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listarEquipos = async (_req, res) => {
  try {
    const result = await EquipoController.listar();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const obtenerEquipo = async (req, res) => {
  try {
    const result = await EquipoController.obtener(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const actualizarEquipo = async (req, res) => {
  try {
    const result = await EquipoController.actualizar(
      req.params.id,
      req.body,
      req.files || []
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const eliminarEquipo = async (req, res) => {
  try {
    await EquipoController.eliminar(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const obtenerPlanesMantenimientoEquipo = async (req, res) => {
  try {
    const { id } = req.params;

    const planes = await EquipoController.obtenerPlanesMantenimientoPorEquipo(id);

    return res.json({
      equipoId: id,
      total: planes.length,
      planes,
    });
  } catch (error) {
    const msg = error.message || "Error";
    const status = msg.toLowerCase().includes("no encontrado") ? 404 : 400;
    return res.status(status).json({ message: msg });
  }
};

const getEquiposByClienteIdHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const data = await EquipoController.GetEquiposByClienteId(clienteId);

    return res.status(200).json({
      message: "Equipos del cliente obtenidos correctamente",
      data,
    });
  } catch (error) {
    console.error("Error getEquiposByClienteIdHandler:", error);
    return res.status(500).json({
      error: "Error al obtener los equipos del cliente",
    });
  }
};

const actualizarAdjuntosPortalEquipoHandler = async (req, res) => {
  try {
    const { equipoId } = req.params;
    const { adjuntosPortal } = req.body;

    if (!equipoId || typeof equipoId !== "string" || !equipoId.trim()) {
      return res.status(400).json({
        success: false,
        message: "El equipoId es obligatorio",
      });
    }

    const equipo = await Equipo.findByPk(equipoId);
    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: "El equipo no existe",
      });
    }

    if (!Array.isArray(adjuntosPortal)) {
      return res.status(400).json({
        success: false,
        message: "adjuntosPortal debe ser un arreglo",
      });
    }

    for (let i = 0; i < adjuntosPortal.length; i++) {
      const item = adjuntosPortal[i];

      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return res.status(400).json({
          success: false,
          message: `El elemento en la posición ${i} no es válido`,
        });
      }

      if (!item.adjuntoId || typeof item.adjuntoId !== "string" || !item.adjuntoId.trim()) {
        return res.status(400).json({
          success: false,
          message: `adjuntoId es obligatorio en la posición ${i}`,
        });
      }

      if (
        item.tituloPortal !== undefined &&
        item.tituloPortal !== null &&
        typeof item.tituloPortal !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: `tituloPortal debe ser string en la posición ${i}`,
        });
      }

      if (
        item.descripcionPortal !== undefined &&
        item.descripcionPortal !== null &&
        typeof item.descripcionPortal !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: `descripcionPortal debe ser string en la posición ${i}`,
        });
      }

      if (
        item.ordenPortal !== undefined &&
        item.ordenPortal !== null &&
        (isNaN(Number(item.ordenPortal)) || Number(item.ordenPortal) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `ordenPortal debe ser un número mayor o igual a 0 en la posición ${i}`,
        });
      }

      const adjunto = await Adjunto.findOne({
        where: {
          id: item.adjuntoId,
          equipoId,
        },
      });

      if (!adjunto) {
        return res.status(400).json({
          success: false,
          message: `El adjunto con id ${item.adjuntoId} no pertenece al equipo`,
        });
      }
    }

    const resultado = await EquipoController.actualizarAdjuntosPortalEquipo(equipoId, adjuntosPortal);

    return res.status(200).json({
      success: true,
      message: "Adjuntos del portal actualizados correctamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error en actualizarAdjuntosPortalEquipoHandler:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};


const obtenerEquipoPortalHandler = async (req, res) => {
  try {
    const { equipoId } = req.params;

    if (!equipoId || typeof equipoId !== "string" || !equipoId.trim()) {
      return res.status(400).json({
        success: false,
        message: "El equipoId es obligatorio",
      });
    }

    const equipo = await EquipoController.obtenerEquipoPortal(equipoId);

    if (!equipo) {
      return res.status(404).json({
        success: false,
        message: "Equipo no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipo portal obtenido correctamente",
      data: equipo,
    });
  } catch (error) {
    console.error("Error en obtenerEquipoPortalHandler:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  crearEquipo,
  listarEquipos,
  obtenerEquipo,
  actualizarEquipo,
  eliminarEquipo,
  obtenerPlanesMantenimientoEquipo,
  getEquiposByClienteIdHandler,
  actualizarAdjuntosPortalEquipoHandler
};