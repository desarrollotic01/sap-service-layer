const controller = require("../controllers/solicitudCompraController");
const validator = require("./solicitudCompraHandler");

// Crear solicitud (DRAFT)
const createSolicitudHandler = async (req, res) => {
  try {
    const errors = validator.validarCreateSolicitud(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const solicitud = await controller.createSolicitudCompra(
      req.user.id,
      req.body
    );

    if (!solicitud) {
      return res.status(500).json({ errors: ["No se pudo crear la solicitud"] });
    }

    res.status(201).json(solicitud);
  } catch (error) {
    console.error("ERROR crear solicitud compra:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error al crear solicitud de compra",
    });
  }
};

// Listar todas las solicitudes (con paginación y búsqueda)
const getSolicitudesHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize) || 20;
    const search = req.query.search || "";

    const result = await controller.getAllSolicitudesCompra(page, limit, search);
    return res.json({ message: "Solicitudes de compra obtenidas", ...result });
  } catch (error) {
    console.error("Error en getSolicitudesHandler:", error);
    return res.status(500).json({ errors: ["Error al obtener solicitudes"] });
  }
};

// Sincronizar con SAP
const syncSolicitudHandler = async (req, res) => {
  const solicitud = await controller.syncSolicitudCompra(req.params.id);

  if (!solicitud) {
    return res.status(400).json({
      errors: ["Solicitud no válida o ya sincronizada"],
    });
  }

  res.json({
    message: "Solicitud enviada a SAP",
    sapDocNum: solicitud.sapDocNum,
  });
};


const enviarSolicitudGeneralHandler = async (req, res) => {
  try {
    const { avisoId, otId } = req.body;

    if (!avisoId) {
      return res.status(400).json({ errors: ["avisoId es obligatorio"] });
    }
    if (!otId) {
      return res.status(400).json({ errors: ["otId es obligatorio"] });
    }

    const result = await controller.enviarSolicitudGeneral({ avisoId, otId });

    return res.json({
      message: "Solicitud general enviada (bloqueada) y asignada a OT",
      solicitud: result,
    });
  } catch (error) {
    return res.status(400).json({ errors: [error.message] });
  }
};


module.exports = {
  createSolicitudHandler,
  getSolicitudesHandler,
  syncSolicitudHandler,
  enviarSolicitudGeneralHandler
};
