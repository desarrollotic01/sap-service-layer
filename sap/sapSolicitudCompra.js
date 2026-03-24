const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

/**
 * Envía una solicitud de compra a SAP
 */
async function enviarSolicitudCompra(solicitud) {
  try {
    const cookies = await loginSAP();

    const payload = {
      DocDate: solicitud.docDate,
      RequriedDate: solicitud.requiredDate,
      Requester: solicitud.requester,
      Comments: solicitud.comments || "",
      DocCurrency: solicitud.docCurrency || "PEN",
      DocRate: solicitud.docRate || 1,

      BPL_IDAssignedToInvoice: solicitud.branchId || undefined,

      DocumentLines: solicitud.lineas.map((linea) => ({
        ItemCode: linea.itemCode,
        ItemDescription: linea.description || "",
        Quantity: Number(linea.quantity),
        WarehouseCode: linea.warehouseCode,

        CostingCode: linea.costingCode || undefined,
        ProjectCode: linea.projectCode || undefined,

       U_ALS_PAQTRAB: linea.paqueteTrabajo?.codigo,
U_ALS_RUBRO: linea.rubro?.codigo,
      })),
    };

    console.log("📦 Payload SAP:");
    console.log(JSON.stringify(payload, null, 2));

    // 🚀 Enviar a SAP
    const response = await sapAxios.post(
      "/PurchaseRequests",
      payload,
      {
        headers: {
          Cookie: cookies,
        },
      }
    );

    console.log("✅ Respuesta SAP:", response.data);

    return {
      success: true,
      data: response.data,
    };

  } catch (error) {
    console.error("❌ Error enviando a SAP:");

    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = {
  enviarSolicitudCompra,
};