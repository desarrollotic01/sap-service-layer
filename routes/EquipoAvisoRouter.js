const express = require("express");
const router = express.Router();
const EquipoAvisoHandler = require("../handlers/EquipoAvisoHandler");
const roleAuth = require("../checkers/roleAuth");
router.get("/:avisoId/equipos-disponibles", roleAuth(["all_access","read_equipos","read_avisos"]), EquipoAvisoHandler.getEquiposDisponiblesHandler);
module.exports = router;