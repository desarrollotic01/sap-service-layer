const {
  generarLinkPortalCliente,
  obtenerPortalClientePorToken,
  listarLinksPortalPorCliente,
  desactivarLinkPortalCliente,
} = require("../controllers/portalClienteController");

const isUUID = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/* =========================================================
   GENERAR LINK
========================================================= */
const generarLinkPortalClienteHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { diasVigencia, permanente } = req.body || {};

    if (!isUUID(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido." });
    }

    if (
      diasVigencia !== undefined &&
      (!Number.isFinite(Number(diasVigencia)) || Number(diasVigencia) <= 0)
    ) {
      return res.status(400).json({
        error: "diasVigencia debe ser un número mayor a 0.",
      });
    }

    if (permanente !== undefined && typeof permanente !== "boolean") {
      return res.status(400).json({
        error: "permanente debe ser boolean.",
      });
    }

    const result = await generarLinkPortalCliente({
      clienteId,
      diasVigencia: diasVigencia ? Number(diasVigencia) : 30,
      permanente: permanente ?? false,
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   ACCESO PORTAL POR TOKEN
========================================================= */
const obtenerPortalClientePorTokenHandler = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== "string" || token.trim().length < 20) {
      return res.status(400).json({ error: "token inválido." });
    }

    const result = await obtenerPortalClientePorToken(token);
    return res.status(200).json(result);
  } catch (error) {
    const msg = error.message || "Error";
    const status = msg.toLowerCase().includes("inválido") || msg.toLowerCase().includes("expirado")
      ? 401
      : 400;

    return res.status(status).json({ error: msg });
  }
};

/* =========================================================
   LISTAR LINKS DE UN CLIENTE
========================================================= */
const listarLinksPortalPorClienteHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;

    if (!isUUID(clienteId)) {
      return res.status(400).json({ error: "clienteId inválido." });
    }

    const links = await listarLinksPortalPorCliente(clienteId);
    return res.status(200).json(links);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   DESACTIVAR LINK
========================================================= */
const desactivarLinkPortalClienteHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "id inválido." });
    }

    const result = await desactivarLinkPortalCliente(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  generarLinkPortalClienteHandler,
  obtenerPortalClientePorTokenHandler,
  listarLinksPortalPorClienteHandler,
  desactivarLinkPortalClienteHandler,
};