const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");   
const EquipoAvisoHandler = require("../handlers/EquipoAvisoHandler");
const e = require("express");
// Rutas para gestionar la relación entre Equipos y Avisos
router.get(
  "/:avisoId/equipos-disponibles", auth, EquipoAvisoHandler.getEquiposDisponiblesHandler
);


module.exports = router;
