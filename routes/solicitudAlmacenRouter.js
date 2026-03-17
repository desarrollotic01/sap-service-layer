const express = require("express");
const router = express.Router();

const {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
} = require("../handlers/solicitudAlmacenHandler");

router.get("/agrupadas/sap", getSolicitudesAlmacenAgrupadasParaSap);
router.get("/:id", getSolicitudAlmacenById);
router.put("/:id", updateSolicitudAlmacen);

module.exports = router;