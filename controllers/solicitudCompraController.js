const { SolicitudCompra, SolicitudCompraLinea } = require("../db_connection");
const sapService = require("../services/sap.services");

const createSolicitudCompra = async (usuarioId, data) => {
  const solicitud = await SolicitudCompra.create({
    usuario_id: usuarioId,
    requiredDate: data.requiredDate,
    department: data.department,
    emailSolicitante: data.email,
    comments: data.comments,
    docCurrency: data.docCurrency,
    docRate: data.docRate,
    bplId: data.bplId,
    estado: "DRAFT",
  });

  for (const l of data.lineas) {
    await SolicitudCompraLinea.create({
      solicitud_compra_id: solicitud.id,
      itemCode: l.itemCode,
      quantity: l.quantity,
      warehouseCode: l.warehouseCode,
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
    });
  }

  return solicitud;
};

const syncSolicitudCompra = async (solicitudId) => {
  const solicitud = await SolicitudCompra.findByPk(solicitudId, {
    include: ["lineas"],
  });

  if (!solicitud || solicitud.estado !== "DRAFT") return null;

  const payloadSAP = {
    DocDate: solicitud.requiredDate,
    RequiredDate: solicitud.requiredDate,
    DocDueDate: solicitud.requiredDate,

    Department: solicitud.department,
    Comments: solicitud.comments,
    DocCurrency: solicitud.docCurrency,
    DocRate: solicitud.docRate,

    BPL_IDAssignedToInvoice: solicitud.bplId,
    U_EmailSolicitante: solicitud.emailSolicitante,

    DocumentLines: solicitud.lineas.map((l) => ({
      ItemCode: l.itemCode,
      Quantity: l.quantity,
      WarehouseCode: l.warehouseCode,
      CostingCode: l.costingCode || undefined,
      ProjectCode: l.projectCode || undefined,
    })),
  };

  const response = await sapService.createPurchaseRequest(payloadSAP);

  solicitud.estado = "SENT";
  solicitud.sapDocNum = response.DocNum;
  await solicitud.save();

  return solicitud;
};

module.exports = {
  createSolicitudCompra,
  syncSolicitudCompra,
};
