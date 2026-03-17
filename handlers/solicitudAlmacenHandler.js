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

module.exports = {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
};