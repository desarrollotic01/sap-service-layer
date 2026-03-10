const { Router } = require("express");
const {
  crearPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler,
  obtenerPlanesPorUbicacionTecnicaHandler,
  obtenerMejorPlanPorUbicacionTecnicaHandler,
  actualizarPlanesMantenimientoEquipo,
  actualizarPlanesMantenimientoUbicacionTecnica,
  cambiarEstadoPlanHandler,
} = require("../handlers/planMantenimientoHandler");
const uploadPlanAdjuntos = require("../middlewares/uploadPlanAdjuntos");

const router = Router();

router.post("/", uploadPlanAdjuntos.any(), crearPlanHandler);

router.get("/", obtenerPlanesHandler);

router.get("/equipo/:equipoId", obtenerPlanesPorEquipoHandler);
router.get("/equipo/:equipoId/mejor", obtenerMejorPlanPorEquipoHandler);
router.put("/equipo/:id/planes", actualizarPlanesMantenimientoEquipo);

router.get("/ubicacion-tecnica/:ubicacionTecnicaId", obtenerPlanesPorUbicacionTecnicaHandler);
router.get(
  "/ubicacion-tecnica/:ubicacionTecnicaId/mejor",
  obtenerMejorPlanPorUbicacionTecnicaHandler
);
router.put(
  "/ubicacion-tecnica/:id/planes",
  actualizarPlanesMantenimientoUbicacionTecnica
);

router.patch("/:id/estado", cambiarEstadoPlanHandler);
router.get("/:id", obtenerPlanPorIdHandler);

module.exports = router;