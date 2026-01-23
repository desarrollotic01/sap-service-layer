const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const {
  getConfigHandler,
  saveConfigHandler,
  resetFiltrosHandler,
} = require("../handlers/userViewConfigHandler");

/* =============================
   ROUTES
============================= */

// Obtener config por vista
router.get("/:view", auth, getConfigHandler);

// Guardar config (filtros, columnas, campos)
router.put("/:view", auth, saveConfigHandler);

// Reset SOLO filtros
router.post("/:view/reset-filtros", auth, resetFiltrosHandler);

module.exports = router;