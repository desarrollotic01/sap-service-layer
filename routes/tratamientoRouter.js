const express = require("express");
const router = express.Router();

const TratamientoHandler = require("../handlers/tratamientoHandler");
const auth = require("../middlewares/auth");
// Crear tratamiento (con o sin solicitud)
router.post(
  "/avisos/:avisoId/tratamiento",auth,
  TratamientoHandler.crearTratamiento
);

router.get(
  "/avisos/:avisoId/tratamiento/solicitudes-para-ot",
  auth,
  TratamientoHandler.obtenerSolicitudesParaOTHandler
);

// Obtener tratamiento de un aviso
router.get(
  "/avisos/:avisoId/tratamiento",auth,
  TratamientoHandler.obtenerTratamiento
);

router.patch(
 "/:tratamientoId/guardar",auth,
  TratamientoHandler.guardarCambiosTratamientoHandler
);

module.exports = router;
