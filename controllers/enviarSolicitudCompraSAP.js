const {
  SolicitudCompra,
  SolicitudCompraLinea,
  Item,
} = require("../db_connection");
const { createPurchaseRequestSAP } = require("../sap/sapPurchaseRequest");

const enviarSolicitudCompraASAP = async (solicitudId) => {
  const solicitud = await SolicitudCompra.findByPk(solicitudId, {
    include: [
      {
        model: SolicitudCompraLinea,
        as: "lineas",
        include: [
          {
            model: Item,
            as: "item",
            required: false,
          },
        ],
      },
    ],
  });

  if (!solicitud) throw new Error("Solicitud no encontrada");
  if (!solicitud.lineas || !solicitud.lineas.length) {
    throw new Error("La solicitud no tiene líneas");
  }

  const payload = {
    DocDate: solicitud.docDate,
    RequriedDate: solicitud.requiredDate,
    Comments: solicitud.comments || null,
    DocCurrency: solicitud.docCurrency || "SOL",
    DocRate: Number(solicitud.docRate || 1),
    Requester: solicitud.requester,

    DocumentLines: solicitud.lineas.map((l, index) => {
      const itemCode = l.itemCode || l.item?.sapCode;

      if (!itemCode) {
        throw new Error(`La línea ${index + 1} no tiene itemCode`);
      }

      if (!l.warehouseCode) {
        throw new Error(`La línea ${index + 1} no tiene warehouseCode`);
      }

      if (!l.quantity || Number(l.quantity) <= 0) {
        throw new Error(`La línea ${index + 1} tiene quantity inválida`);
      }

      return {
        ItemCode: itemCode,
        ItemDescription: l.description || l.item?.nombre || null,
        Quantity: Number(l.quantity),
        WarehouseCode: l.warehouseCode,
        CostingCode: l.costingCode || null,
        ProjectCode: l.projectCode || null,
        U_ALS_RUBRO: l.rubroSapCode || l.rubro || null,
        U_ALS_PAQTRAB: l.paqueteTrabajo || null,
      };
    }),
  };

  const sapResponse = await createPurchaseRequestSAP(payload);

  await solicitud.update({
    estado: "SENT",
    sapDocNum: sapResponse.DocNum || null,
  });

  return {
    payload,
    sapResponse,
  };
};

module.exports = {
  enviarSolicitudCompraASAP,
};