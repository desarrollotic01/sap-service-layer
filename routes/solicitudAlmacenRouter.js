const express = require("express");
const router = express.Router();
const {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
  createSolicitudAlmacenHandler,
  getAllSolicitudesAlmacenHandler,
  enviarBloqueHandler,
} = require("../handlers/solicitudAlmacenHandler");
const roleAuth = require("../checkers/roleAuth");

router.get("/", roleAuth(["all_access","read_solicitudes_almacen"]), getAllSolicitudesAlmacenHandler);
router.get("/agrupadas/sap", roleAuth(["all_access","read_solicitudes_almacen"]), getSolicitudesAlmacenAgrupadasParaSap);
router.get("/:id", roleAuth(["all_access","read_solicitudes_almacen"]), getSolicitudAlmacenById);
router.put("/:id", roleAuth(["all_access","update_solicitudes_almacen"]), updateSolicitudAlmacen);
router.post("/", roleAuth(["all_access","create_solicitudes_almacen"]), createSolicitudAlmacenHandler);

// Enviar un bloque de solicitudes de almacén por correo
// Body: { bloqueId: "uuid", ordenTrabajoId: "uuid" }
router.post("/bloque/enviar", roleAuth(["all_access","create_solicitudes_almacen"]), enviarBloqueHandler);

module.exports = router;