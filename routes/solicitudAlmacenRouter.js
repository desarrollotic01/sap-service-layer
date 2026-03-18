const express = require("express");
const router = express.Router();

const {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
  createSolicitudAlmacenHandler
} = require("../handlers/solicitudAlmacenHandler");

router.get("/agrupadas/sap", getSolicitudesAlmacenAgrupadasParaSap);  
router.get("/:id", getSolicitudAlmacenById);
router.put("/:id", updateSolicitudAlmacen);
router.post("/", createSolicitudAlmacenHandler);

module.exports = router;