const router = require("express").Router();
const {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
  generarNotificacionesPorOT,
  generarPdfNotificacion,
  listarNotificacionesPorOT
} = require("../handlers/notificacionHandler");

const auth = require("../middlewares/auth");


router.post("/", auth, crearNotificacion);
router.get("/", auth, listarNotificaciones);
router.get("/:id", auth, obtenerNotificacion);
router.patch("/:id/finalizar", auth, finalizarNotificacion);
router.post("/ots/:ordenTrabajoId/generar", auth, generarNotificacionesPorOT);
router.get("/:id/pdf", auth, generarPdfNotificacion);
router.get("/ot/:ordenTrabajoId", auth, listarNotificacionesPorOT);

module.exports = router;
