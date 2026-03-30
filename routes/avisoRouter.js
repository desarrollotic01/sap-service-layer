const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const handler = require("../handlers/avisosHandler");
const upload = require("../middlewares/upload");


router.post(
  "/",
  upload.fields([
    { name: "documentos", maxCount: 10 },
    { name: "documentoFinal", maxCount: 1 },
  ]),auth,
  handler.crearAvisoHandler
);
router.get("/", auth, handler.obtenerAvisosHandler);
router.get("/:id", auth, handler.obtenerAvisoPorIdHandler);
router.put("/:id", auth, handler.actualizarAvisoHandler);
router.delete("/:id", auth, handler.eliminarAvisoHandler);
router.patch("/:id/estado", auth, handler.actualizarEstadoAvisoHandler);
router.get("/origen/manual", handler.getAvisosManualHandler);
router.get("/origen/guia", handler.getAvisosGuiaHandler);
module.exports = router;
