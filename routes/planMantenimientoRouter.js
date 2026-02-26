const { Router } = require("express");
const {
  crearPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler,
  actualizarPlanesMantenimientoEquipo,
} = require("../handlers/planMantenimientoHandler");

const auth = require("../middlewares/auth");
const router = Router();

router.post("/", auth,crearPlanHandler);
router.get("/", auth, obtenerPlanesHandler);
router.get("/equipo/:equipoId/mejor", auth, obtenerMejorPlanPorEquipoHandler);
router.get("/equipo/:equipoId", auth, obtenerPlanesPorEquipoHandler);
router.put("/:id/planes-mantenimiento", auth, actualizarPlanesMantenimientoEquipo);
router.get("/:id", auth, obtenerPlanPorIdHandler);
module.exports = router;
