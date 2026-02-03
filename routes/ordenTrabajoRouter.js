const express = require("express");
const router = express.Router();
const handler = require("../handlers/ordenTrabajoHandler");

router.post("/", handler.crearOrdenTrabajoHandler);
router.get("/", handler.obtenerOrdenesTrabajoHandler);
router.get("/:id", handler.obtenerOrdenTrabajoPorIdHandler);
router.put("/:id", handler.actualizarOrdenTrabajoHandler);
router.delete("/:id", handler.eliminarOrdenTrabajoHandler);

module.exports = router;
