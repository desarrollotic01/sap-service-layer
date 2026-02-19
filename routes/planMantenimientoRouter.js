const { Router } = require("express");
const {
  crearPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler
} = require("../handlers/planMantenimientoHandler");

const router = Router();

router.post("/", crearPlanHandler);
router.get("/", obtenerPlanesHandler);
router.get("/equipo/:equipoId/mejor", obtenerMejorPlanPorEquipoHandler);
router.get("/equipo/:equipoId", obtenerPlanesPorEquipoHandler);
router.get("/:id", obtenerPlanPorIdHandler);
module.exports = router;
