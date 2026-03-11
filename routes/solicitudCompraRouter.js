const express = require("express");
const router = express.Router();
const handler = require("../handlers/solicitudCompraHttpHandler");
const update = require("../handlers/solicitudCompraHandler");
const auth = require("../middlewares/auth");

const {
  enviarSolicitudCompraASAPHandler,
} = require("../handlers/enviarSolicitudCompraSAPHandler");

router.post("/:id/enviar-sap", enviarSolicitudCompraASAPHandler);

router.post("/", auth, handler.createSolicitudHandler);
router.get("/", auth, handler.getSolicitudesHandler);
router.post("/general/enviar", auth, handler.enviarSolicitudGeneralHandler);

router.post("/:id/sync", auth, handler.syncSolicitudHandler);
router.put("/:id", auth, update.updateSolicitudHandler);


module.exports = router;
