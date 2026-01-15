const controller = require("../controllers/solicitudCompraController");
const validator = require("./solicitudCompraHandler");

// Crear solicitud (DRAFT)
const createSolicitudHandler = async (req, res) => {
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
};

// Listar solicitudes del usuario
const getSolicitudesHandler = async (req, res) => {
  const solicitudes = await controller.getSolicitudesByUsuario(req.user.id);

  if (!solicitudes) {
    return res.status(500).json({ errors: ["Error al obtener solicitudes"] });
  }

  res.json(solicitudes);
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

module.exports = {
  createSolicitudHandler,
  getSolicitudesHandler,
  syncSolicitudHandler,
};
