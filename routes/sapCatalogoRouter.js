const express = require("express");
const router = express.Router();

const {
  handleGetSapRubro,
  handleGetSapPaqueteTrabajo,
} = require("../handlers/sapCatalogoHandler");

// 🔥 endpoints
router.get("/rubros", handleGetSapRubro);
router.get("/paquetes", handleGetSapPaqueteTrabajo);

module.exports = router;