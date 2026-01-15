const { SolicitudCompra, SolicitudCompraLinea } = require("../db_connection");
const sapService = require("../services/sap.services");

// Crear solicitud (DRAFT)
const createSolicitudCompra = async (usuarioId, data) => {
  try {
    const solicitud = await SolicitudCompra.create({
      usuario_id: usuarioId,
  requiredDate: data.requiredDate,
  department: data.department,
  comments: data.comments,
  docCurrency: data.docCurrency,
  docRate: data.docRate,
  estado: "DRAFT",
    });

    for (const linea of data.lineas) {
      await SolicitudCompraLinea.create({
        solicitud_compra_id: solicitud.id,
        itemCode: linea.itemCode,
        quantity: linea.quantity,
        warehouseCode: linea.warehouseCode,
      });
    }

    return solicitud;
  } catch (error) {
    console.error("Error createSolicitudCompra:", error);
    return false;
  }
};

// Obtener solicitudes del usuario
const getSolicitudesByUsuario = async (usuarioId) => {
  try {
    return await SolicitudCompra.findAll({
      where: { usuario_id: usuarioId },
      include: ["lineas"],
      order: [["createdAt", "DESC"]],
    });
  } catch (error) {
    console.error("Error getSolicitudesByUsuario:", error);
    return false;
  }
};

// Sincronizar con SAP
const syncSolicitudCompra = async (solicitudId) => {
  try {
    const solicitud = await SolicitudCompra.findByPk(solicitudId, {
      include: ["lineas"],
    });

    if (!solicitud || solicitud.estado !== "DRAFT") return null;

    // Payload SAP
    const payload = {
      RequiredDate: solicitud.requiredDate,
      DocumentLines: solicitud.lineas.map((l) => ({
        ItemCode: l.itemCode,
        Quantity: l.quantity,
        WarehouseCode: l.warehouseCode,
      })),
    };

    const sapResponse = await sapService.createPurchaseRequest(payload);

    solicitud.estado = "SENT";
    solicitud.sapDocNum = sapResponse.DocNum;
    await solicitud.save();

    return solicitud;
  } catch (error) {
    console.error("Error syncSolicitudCompra:", error);
    return false;
  }
};

module.exports = {
  createSolicitudCompra,
  getSolicitudesByUsuario,
  syncSolicitudCompra,
};
