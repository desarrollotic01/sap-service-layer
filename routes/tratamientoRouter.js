const express = require("express");
const router = express.Router();
const TratamientoHandler = require("../handlers/tratamientoHandler");
const roleAuth = require("../checkers/roleAuth");
router.post("/avisos/:avisoId/tratamiento", roleAuth(["all_access","create_tratamientos"]), TratamientoHandler.crearTratamiento);
router.get("/avisos/:avisoId/tratamiento/solicitudes-para-ot", roleAuth(["all_access","read_tratamientos"]), TratamientoHandler.obtenerSolicitudesParaOTHandler);
router.get("/avisos/:avisoId/tratamiento", roleAuth(["all_access","read_tratamientos"]), TratamientoHandler.obtenerTratamiento);
router.patch("/:tratamientoId/guardar", roleAuth(["all_access","update_tratamientos"]), TratamientoHandler.guardarCambiosTratamientoHandler);
module.exports = router;