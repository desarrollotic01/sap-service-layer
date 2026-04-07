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
router.get("/:id/verificar-liberacion", auth, handler.verificarLiberacionHandler);
router.patch("/:id/liberar", auth, handler.liberarOrdenTrabajoHandler);
 
// Solicitudes
router.get("/:id/solicitudes", auth, handler.obtenerSolicitudesPorOTHandler);
router.get("/:id/preview-solicitudes", auth, handler.previewSolicitudesHandler);
router.post("/:id/generar-solicitud-compra", auth, handler.generarSolicitudCompraHandler);
router.post("/:id/generar-solicitud-almacen", auth, handler.generarSolicitudAlmacenHandler);
router.post("/:id/asignar-solicitud-general", auth, handler.asignarSolicitudGeneralAOTHandler);
router.post("/:id/solicitud-compra/general", auth, handler.crearSolicitudCompraGeneralHandler);
router.post("/:id/solicitud-almacen/general", auth, handler.crearSolicitudAlmacenGeneralHandler);
 
// SAP
router.post("/:id/sync-sap", auth, handler.syncSAPOrdenTrabajoHandler);
 
// Detalle tratamiento
router.get("/:id/solicitudes-tratamiento", auth, handler.getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler);
 
// Solicitudes generales pendientes (aviso)
router.get("/aviso/:avisoId/solicitudes-pendientes", auth, handler.obtenerSolicitudesGeneralesPendientesHandler);
 
module.exports = router;