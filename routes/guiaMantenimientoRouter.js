const { Router } = require("express");

const {
  CreateGuiaMantenimientoHandler,
  GetAllGuiaMantenimientoHandler,
  GetGuiaMantenimientoByIdHandler,
  UpdateGuiaMantenimientoHandler,
  DeleteGuiaMantenimientoHandler,
  DeleteAdjuntoGuiaMantenimientoHandler,
} = require("../handlers/guiaMantenimientoHandler");

const {
  EjecutarProgramacionGuiaMantenimientoHandler,
  CancelarProgramacionGuiaMantenimientoHandler,
  JobMarcarVencidasProgramacionesGuiaMantenimientoHandler,
} = require("../handlers/guiaMantenimientoProgramacionHandler");

const {
  JobCrearAvisosDesdeAlertasGuiaMantenimientoHandler,
} = require("../handlers/guiaMantenimientoAlertaJobHandler");

const router = Router();

/* GUIAS */
router.post("/", CreateGuiaMantenimientoHandler);
router.get("/", GetAllGuiaMantenimientoHandler);
router.get("/:id", GetGuiaMantenimientoByIdHandler);
router.put("/:id", UpdateGuiaMantenimientoHandler);
router.delete("/:id", DeleteGuiaMantenimientoHandler);
router.delete("/adjuntos/:adjuntoId", DeleteAdjuntoGuiaMantenimientoHandler);

/* PROGRAMACIONES */
router.post("/programaciones/:id/ejecutar", EjecutarProgramacionGuiaMantenimientoHandler);
router.post("/programaciones/:id/cancelar", CancelarProgramacionGuiaMantenimientoHandler);

/* JOBS */
router.post(
  "/programaciones/jobs/marcar-vencidas",
  JobMarcarVencidasProgramacionesGuiaMantenimientoHandler
);

router.post(
  "/programaciones/jobs/crear-avisos-alerta",
  JobCrearAvisosDesdeAlertasGuiaMantenimientoHandler
);

module.exports = router;