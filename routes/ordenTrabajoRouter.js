const express = require("express");
const router = express.Router();
const handler = require("../handlers/ordenTrabajoHandler");

const auth = require("../middlewares/auth");
const {syncSolicitudesCompraOT} = require("../controllers/ordenTrabajoController")

router.post("/", auth, handler.crearOrdenTrabajoHandler);
router.get("/", auth, handler.obtenerOrdenesTrabajoHandler);
router.get("/:id/solicitudes-tratamiento", handler.getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler);
router.get("/:id", auth, handler.obtenerOrdenTrabajoPorIdHandler);
router.patch("/:id/completa", auth, handler.actualizarOrdenTrabajoCompletaHandler);
router.delete("/:id", auth, handler.eliminarOrdenTrabajoHandler);
router.patch("/:id/liberar", auth, handler.liberarOrdenTrabajo);
router.post("/:id/sync-sap",syncSolicitudesCompraOT);

module.exports = router;
