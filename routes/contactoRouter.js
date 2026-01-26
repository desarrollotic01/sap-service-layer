const express = require("express");
const router = express.Router();

const {
  crearContactoHandler,
  obtenerContactosHandler,
  obtenerContactosPorClienteHandler,
  obtenerContactoPorIdHandler,
  actualizarContactoHandler,
  eliminarContactoHandler,
} = require("../handlers/contactoHandler");

const auth = require("../middlewares/auth");


router.post("/", auth, crearContactoHandler);
router.get("/", auth, obtenerContactosHandler);
router.get("/cliente/:clienteId", auth, obtenerContactosPorClienteHandler);
router.get("/:id", auth, obtenerContactoPorIdHandler);
router.put("/:id", auth, actualizarContactoHandler);
router.delete("/:id", auth, eliminarContactoHandler);

module.exports = router;
