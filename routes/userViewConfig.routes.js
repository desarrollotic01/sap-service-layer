const express = require("express");
const router = express.Router();
const { getConfigHandler, saveConfigHandler, resetFiltrosHandler } = require("../handlers/userViewConfigHandler");
const roleAuth = require("../checkers/roleAuth");
router.get("/:view", roleAuth(["all_access","read_view_config"]), getConfigHandler);
router.put("/:view", roleAuth(["all_access","update_view_config"]), saveConfigHandler);
router.post("/:view/reset-filtros", roleAuth(["all_access","update_view_config"]), resetFiltrosHandler);
module.exports = router;