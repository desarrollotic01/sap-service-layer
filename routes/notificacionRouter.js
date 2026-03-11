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

router.post("/", uploadAdjuntosNotificacion.any(), crearNotificacion);

router.get("/", listarNotificaciones);

/* rutas por OT */
router.get("/ot/:ordenTrabajoId", listarNotificacionesPorOT);
router.post("/ot/:ordenTrabajoId/generar", generarNotificacionesPorOT);

/* rutas por notificación */
router.get("/:id/pdf", generarPdfNotificacion);
router.post("/:id/finalizar", finalizarNotificacion);
router.get("/:id", obtenerNotificacion);

module.exports = router;