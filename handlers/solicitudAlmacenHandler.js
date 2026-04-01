const SolicitudAlmacenController = require("../controllers/SolicitudAlmacenController");

const esUUID = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const getSolicitudAlmacenById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !esUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "id inválido",
      });
    }

    const data = await SolicitudAlmacenController.getSolicitudAlmacenById(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Error al obtener solicitud de almacén",
    });
  }
};

const updateSolicitudAlmacen = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !esUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "id inválido",
      });
    }

    const data = req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: "El body debe ser un objeto válido",
      });
    }

    const updated = await SolicitudAlmacenController.updateSolicitudAlmacen({
      id,
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Solicitud de almacén actualizada correctamente",
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error al actualizar solicitud de almacén",
    });
  }
};

const getSolicitudesAlmacenAgrupadasParaSap = async (req, res) => {
  try {
    const {
      tratamientoId,
      ordenTrabajoId,
      incluirGeneral = "true",
      incluirIndividuales = "true",
    } = req.query;

    if (!tratamientoId && !ordenTrabajoId) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar tratamientoId u ordenTrabajoId",
      });
    }

    if (tratamientoId && !esUUID(tratamientoId)) {
      return res.status(400).json({
        success: false,
        message: "tratamientoId inválido",
      });
    }

    if (ordenTrabajoId && !esUUID(ordenTrabajoId)) {
      return res.status(400).json({
        success: false,
        message: "ordenTrabajoId inválido",
      });
    }

    const data =
      await SolicitudAlmacenController.getSolicitudesAlmacenAgrupadasParaSap({
        tratamientoId: tratamientoId || null,
        ordenTrabajoId: ordenTrabajoId || null,
        incluirGeneral: incluirGeneral === "true",
        incluirIndividuales: incluirIndividuales === "true",
      });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message || "Error al obtener solicitudes de almacén agrupadas",
    });
  }
};



const createSolicitudAlmacenHandler = async (req, res) => {
  try {
    const usuarioId = req.user?.id || req.usuario?.id || null;

    const result = await SolicitudAlmacenController.createSolicitudAlmacen({
      usuarioId,
      data: req.body,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error en createSolicitudAlmacenHandler:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Error al crear solicitud de almacén",
    });
  }
};


const enviarBloqueHandler = async (req, res) => {
  try {
    const { bloqueId, ordenTrabajoId } = req.body;

    const resultado = await SolicitudAlmacenController.enviarBloqueSolicitudes({
      bloqueId,
      ordenTrabajoId,
    });

    res.json(resultado);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
};
// En ordenTrabajoHandler.js

const previewSolicitudesHandler = async (req, res) => {
  try {
    const data = await ordenTrabajoController.previewSolicitudesOT(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const generarSolicitudCompraHandler = async (req, res) => {
  try {
    const solicitud = await ordenTrabajoController.generarSolicitudCompraOT(req.params.id);
    res.json({ success: true, data: solicitud });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const generarSolicitudAlmacenHandler = async (req, res) => {
  try {
    const { destinatario, ccEmails = [] } = req.body;

    if (!destinatario) {
      return res.status(400).json({ 
        success: false, 
        message: "destinatario es obligatorio" 
      });
    }

    const resultado = await ordenTrabajoController.generarSolicitudAlmacenOT(
      req.params.id,
      { destinatario, ccEmails }
    );

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
    createSolicitudAlmacenHandler,
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
  enviarBloqueHandler,
  previewSolicitudesHandler,
  generarSolicitudCompraHandler,
  generarSolicitudAlmacenHandler,
};