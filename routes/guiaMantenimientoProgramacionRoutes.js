const { Router } = require("express");
const {
  EjecutarProgramacionGuiaMantenimientoHandler,
  CancelarProgramacionGuiaMantenimientoHandler,
  JobMarcarVencidasProgramacionesGuiaMantenimientoHandler,
} = require("../handlers/guiaMantenimientoProgramacionHandler");
const router = Router();
// acciones
router.post("/programaciones/:id/ejecutar", EjecutarProgramacionGuiaMantenimientoHandler);
router.post("/programaciones/:id/cancelar", CancelarProgramacionGuiaMantenimientoHandler);
// job
router.post("/programaciones/jobs/marcar-vencidas", JobMarcarVencidasProgramacionesGuiaMantenimientoHandler);
module.exports = router;