const express = require("express");
const router = express.Router();
const handler = require("../handlers/ordenTrabajoHandler");
const auth = require("../middlewares/auth");

// CRUD principal
router.post("/", auth, handler.crearOrdenTrabajoHandler);
router.get("/", auth, handler.obtenerOrdenesTrabajoHandler);
router.get("/:id", auth, handler.obtenerOrdenTrabajoPorIdHandler);
router.patch("/:id/completa", auth, handler.actualizarOrdenTrabajoCompletaHandler);
router.delete("/:id", auth, handler.eliminarOrdenTrabajoHandler);

// Ciclo de vida
router.patch("/:id/liberar", auth, handler.liberarOrdenTrabajo);

// Solicitudes
router.get("/:id/solicitudes", auth, handler.obtenerSolicitudesPorOTHandler);
router.get("/:id/preview-solicitudes", auth, handler.previewSolicitudesHandler);
router.post("/:id/generar-solicitud-compra", auth, handler.generarSolicitudCompraHandler);
router.post("/:id/generar-solicitud-almacen", auth, handler.generarSolicitudAlmacenHandler);

// Asignar solicitud general que quedó sin OT (modo INDIVIDUAL)
router.post("/:id/asignar-solicitud-general", auth, handler.asignarSolicitudGeneralAOTHandler);

// SAP
router.post("/:id/sync-sap", handler.syncSAPOrdenTrabajoHandler);

// Detalle tratamiento
router.get("/:id/solicitudes-tratamiento", handler.getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler);


router.post("/:id/solicitud-compra/general", auth, handler.crearSolicitudCompraGeneralHandler);
router.post("/:id/solicitud-almacen/general", auth, handler.crearSolicitudAlmacenGeneralHandler);
module.exports = router;