const express = require("express");
const router = express.Router();
const handler = require("../handlers/avisosHandler");
const upload = require("../middlewares/upload");
const roleAuth = require("../checkers/roleAuth");

router.post("/", roleAuth(["all_access", "create_avisos"]), upload.fields([{ name: "documentos", maxCount: 10 }, { name: "documentoFinal", maxCount: 1 }]), handler.crearAvisoHandler);
router.get("/", roleAuth(["all_access", "read_avisos"]), handler.obtenerAvisosHandler);
router.get("/origen/manual", roleAuth(["all_access", "read_avisos"]), handler.getAvisosManualHandler);
router.get("/origen/guia", roleAuth(["all_access", "read_avisos"]), handler.getAvisosGuiaHandler);
router.get("/:id", roleAuth(["all_access", "read_avisos"]), handler.obtenerAvisoPorIdHandler);
router.put("/:id", roleAuth(["all_access", "update_avisos"]), handler.actualizarAvisoHandler);
router.delete("/:id", roleAuth(["all_access", "delete_avisos"]), handler.eliminarAvisoHandler);
router.patch("/:id/estado", roleAuth(["all_access", "update_avisos"]), handler.actualizarEstadoAvisoHandler);

module.exports = router;
