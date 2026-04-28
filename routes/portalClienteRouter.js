const { Router } = require("express");
const {
  generarLinkPortalClienteHandler,
  obtenerPortalClientePorTokenHandler,
  listarLinksPortalPorClienteHandler,
  desactivarLinkPortalClienteHandler,
  obtenerNotificacionPdfPortalHandler,
} = require("../handlers/portalClienteHandler");

const router = Router();

/* ADMIN / INTERNO */
router.post("/generar-link/:clienteId", generarLinkPortalClienteHandler);
router.get("/links/:clienteId", listarLinksPortalPorClienteHandler);
router.patch("/desactivar/:id", desactivarLinkPortalClienteHandler);

/* PORTAL EXTERNO */
router.get("/acceso/:token", obtenerPortalClientePorTokenHandler);
router.get("/:token/notificacion/:id/pdf", obtenerNotificacionPdfPortalHandler);

module.exports = router;