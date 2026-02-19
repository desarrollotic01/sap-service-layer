const express = require("express");
const router = express.Router();
const handler = require("../handlers/ordenTrabajoHandler");

const auth = require("../middlewares/auth");

router.post("/", auth, handler.crearOrdenTrabajoHandler);
router.get("/", auth, handler.obtenerOrdenesTrabajoHandler);
router.get("/:id", auth, handler.obtenerOrdenTrabajoPorIdHandler);
router.put("/:id", auth, handler.actualizarOrdenTrabajoHandler);
router.delete("/:id", auth, handler.eliminarOrdenTrabajoHandler);
router.patch("/:id/liberar", auth, handler.liberarOrdenTrabajo);

module.exports = router;
