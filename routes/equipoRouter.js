const { Router } = require("express");
const {
  crearEquipo,
  listarEquipos,
  obtenerEquipo,
  actualizarEquipo,
  eliminarEquipo,
  obtenerPlanesMantenimientoEquipo,
  getEquiposByClienteIdHandler,
  actualizarAdjuntosPortalEquipoHandler
} = require("../handlers/equipoHandler");
const uploadEquipoAdjuntos = require("../middlewares/uploadEquipoAdjuntos");

const router = Router();

router.post("/", uploadEquipoAdjuntos.array("adjuntos"), crearEquipo);
router.get("/", listarEquipos);
router.get("/:id", obtenerEquipo);
router.put("/:id", uploadEquipoAdjuntos.array("adjuntos"), actualizarEquipo);
router.delete("/:id", eliminarEquipo);
router.get("/:id/planes-mantenimiento", obtenerPlanesMantenimientoEquipo);
router.get("/cliente/:clienteId", getEquiposByClienteIdHandler);
router.put("/:equipoId/adjuntos-portal", actualizarAdjuntosPortalEquipoHandler);

module.exports = router;