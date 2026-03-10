const express = require("express");
const router = express.Router();
const uploadAdjuntosNotificacion = require("../middlewares/uploadAdjuntosNotificacion");
const {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
  generarNotificacionesPorOT,
  generarPdfNotificacion,
  listarNotificacionesPorOT,
} = require("../handlers/notificacionHandler");

router.post(
  "/",
  uploadAdjuntosNotificacion.any(),
  crearNotificacion
);

router.get("/", listarNotificaciones);
router.get("/:id", obtenerNotificacion);
router.post("/:id/finalizar", finalizarNotificacion);
router.post("/ots/:ordenTrabajoId/generar", generarNotificacionesPorOT);
router.get("/:id/pdf", generarPdfNotificacion);
router.get("/ots/:ordenTrabajoId/listar", listarNotificacionesPorOT);

module.exports = router;