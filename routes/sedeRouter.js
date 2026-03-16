const express = require("express");
const router = express.Router();

const {
  CreateSedeHandler,
  GetAllSedesHandler,
  GetSedeByIdHandler,
  GetSedesByClienteIdHandler,
  UpdateSedeHandler,
  DeleteSedeHandler,
  AsignarEquiposASedeHandler,
  QuitarEquipoDeSedeHandler,
  GetEquiposPorSedeHandler,
  AsignarUbicacionesTecnicasASedeHandler,
  QuitarUbicacionTecnicaDeSedeHandler,
  GetUbicacionesTecnicasPorSedeHandler,
} = require("../handlers/sedeHandler");

router.post("/", CreateSedeHandler);
router.get("/", GetAllSedesHandler);
router.get("/cliente/:clienteId", GetSedesByClienteIdHandler);
router.get("/:id", GetSedeByIdHandler);
router.put("/:id", UpdateSedeHandler);
router.delete("/:id", DeleteSedeHandler);

router.put("/:sedeId/asignar-equipos", AsignarEquiposASedeHandler);
router.put("/:sedeId/quitar-equipo/:equipoId", QuitarEquipoDeSedeHandler);
router.get("/:sedeId/equipos", GetEquiposPorSedeHandler);

router.put(
  "/:sedeId/asignar-ubicaciones-tecnicas",
  AsignarUbicacionesTecnicasASedeHandler
);
router.put(
  "/:sedeId/quitar-ubicacion-tecnica/:ubicacionId",
  QuitarUbicacionTecnicaDeSedeHandler
);
router.get(
  "/:sedeId/ubicaciones-tecnicas",
  GetUbicacionesTecnicasPorSedeHandler
);

module.exports = router;