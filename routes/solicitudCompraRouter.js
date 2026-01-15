const express = require("express");
const router = express.Router();
const handler = require("../handlers/solicitudCompraHttpHandler");
const auth = require("../middlewares/auth");

router.post("/", auth, handler.createSolicitudHandler);
router.get("/", auth, handler.getSolicitudesHandler);
router.post("/:id/sync", auth, handler.syncSolicitudHandler);

module.exports = router;
