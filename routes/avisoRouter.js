const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const handler = require("../handlers/avisosHandler");

router.post("/", auth, handler.crearAvisoHandler);
router.get("/", auth, handler.obtenerAvisosHandler);
router.get("/:id", auth, handler.obtenerAvisoPorIdHandler);
router.put("/:id", auth, handler.actualizarAvisoHandler);
router.delete("/:id", auth, handler.eliminarAvisoHandler);
router.patch("/:id/estado", auth, handler.actualizarEstadoAvisoHandler);

module.exports = router;
