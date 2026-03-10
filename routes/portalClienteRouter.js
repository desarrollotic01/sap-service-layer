const { Router } = require("express");
const {
  generarLinkPortalClienteHandler,
  obtenerPortalClientePorTokenHandler,
  listarLinksPortalPorClienteHandler,
  desactivarLinkPortalClienteHandler,
} = require("../handlers/portalClienteHandler");

const router = Router();

/* ADMIN / INTERNO */
router.post("/generar-link/:clienteId", generarLinkPortalClienteHandler);
router.get("/links/:clienteId", listarLinksPortalPorClienteHandler);
router.patch("/desactivar/:id", desactivarLinkPortalClienteHandler);

/* PORTAL EXTERNO */
router.get("/acceso/:token", obtenerPortalClientePorTokenHandler);

module.exports = router;