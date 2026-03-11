const {
  enviarSolicitudCompraASAP,
} = require("../controllers/enviarSolicitudCompraSAP");

const enviarSolicitudCompraASAPHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await enviarSolicitudCompraASAP(id);

    return res.status(200).json({
      ok: true,
      message: "Solicitud enviada a SAP correctamente",
      ...data,
    });
  } catch (error) {
    console.error("Error al enviar solicitud a SAP:", error.response?.data || error.message);

    return res.status(500).json({
      ok: false,
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  enviarSolicitudCompraASAPHandler,
};