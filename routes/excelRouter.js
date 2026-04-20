const express = require("express");
const router = express.Router();
const handler = require("../handlers/excelHttpHandler");
const roleAuth = require("../checkers/roleAuth");
router.get("/:modulo/fields", handler.getFieldsHandler);
router.get("/:modulo/config", roleAuth(["all_access","read_excel"]), handler.getConfigHandler);
router.put("/:modulo/config", roleAuth(["all_access","update_excel"]), handler.saveConfigHandler);
router.get("/:modulo/export", roleAuth(["all_access","read_excel"]), handler.exportHandler);
module.exports = router;