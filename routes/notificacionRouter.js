const router = require("express").Router();
const {
  crearNotificacion,
  obtenerNotificacion,
  listarNotificaciones,
  finalizarNotificacion,
} = require("../handlers/notificacionHandler");

const auth = require("../middlewares/auth");


router.post("/", auth, crearNotificacion);
router.get("/", auth, listarNotificaciones);
router.get("/:id", auth, obtenerNotificacion);
router.patch("/:id/finalizar", auth, finalizarNotificacion);

module.exports = router;
