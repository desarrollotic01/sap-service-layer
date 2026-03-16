const {
  generarLinkPortalCliente,
  obtenerPortalClientePorToken,
  listarLinksPortalPorCliente,
  desactivarLinkPortalCliente,
} = require("../controllers/portalClienteController");

/* =========================================================
   GENERAR LINK PORTAL CLIENTE
========================================================= */
const generarLinkPortalClienteHandler = async (req, res) => {
  try {
    const { clienteId, diasVigencia, permanente } = req.body;

    if (!clienteId || typeof clienteId !== "string" || !clienteId.trim()) {
      return res.status(400).json({
        success: false,
        message: "clienteId es obligatorio",
      });
    }

    if (
      diasVigencia !== undefined &&
      diasVigencia !== null &&
      (isNaN(Number(diasVigencia)) || Number(diasVigencia) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "diasVigencia debe ser un número mayor a 0",
      });
    }

    if (
      permanente !== undefined &&
      permanente !== null &&
      typeof permanente !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "permanente debe ser boolean",
      });
    }

    const resultado = await generarLinkPortalCliente({
      clienteId: clienteId.trim(),
      diasVigencia,
      permanente,
    });

    return res.status(201).json({
      success: true,
      message: "Link del portal generado correctamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error en generarLinkPortalClienteHandler:", error);

    if (error.message === "Cliente no encontrado") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/* =========================================================
   OBTENER PORTAL CLIENTE POR TOKEN
========================================================= */
const obtenerPortalClientePorTokenHandler = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "El token es obligatorio",
      });
    }

    const resultado = await obtenerPortalClientePorToken(token.trim());

    return res.status(200).json({
      success: true,
      message: "Portal del cliente obtenido correctamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error en obtenerPortalClientePorTokenHandler:", error);

    if (error.message === "Link inválido o expirado") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/* =========================================================
   LISTAR LINKS DE UN CLIENTE
========================================================= */
const listarLinksPortalPorClienteHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;

    if (!clienteId || typeof clienteId !== "string" || !clienteId.trim()) {
      return res.status(400).json({
        success: false,
        message: "clienteId es obligatorio",
      });
    }

    const resultado = await listarLinksPortalPorCliente(clienteId.trim());

    return res.status(200).json({
      success: true,
      message: "Links del portal obtenidos correctamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error en listarLinksPortalPorClienteHandler:", error);

    if (error.message === "Cliente no encontrado") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

/* =========================================================
   DESACTIVAR LINK
========================================================= */
const desactivarLinkPortalClienteHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "El id del link es obligatorio",
      });
    }

    const resultado = await desactivarLinkPortalCliente(id.trim());

    return res.status(200).json({
      success: true,
      message: "Link desactivado correctamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error en desactivarLinkPortalClienteHandler:", error);

    if (error.message === "Link no encontrado") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = {
  generarLinkPortalClienteHandler,
  obtenerPortalClientePorTokenHandler,
  listarLinksPortalPorClienteHandler,
  desactivarLinkPortalClienteHandler,
};