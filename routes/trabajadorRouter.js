const express = require("express");
const router = express.Router();

const TrabajadorHandler = require("../handlers/trabajadorHandler");

// CRUD
router.post("/", TrabajadorHandler.crearTrabajador);
router.get("/", TrabajadorHandler.listarTrabajadores);
router.get("/:id", TrabajadorHandler.obtenerTrabajador);
router.put("/:id", TrabajadorHandler.actualizarTrabajador);
router.delete("/:id", TrabajadorHandler.desactivarTrabajador);

module.exports = router;
