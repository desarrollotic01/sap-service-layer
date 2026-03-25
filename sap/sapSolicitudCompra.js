const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

/**
 * Enviar solicitud de compra a SAP
 */
async function enviarSolicitudCompra(solicitud) {
  try {
    const cookies = await loginSAP();

    const config = {
      headers: {
        Cookie: cookies,
      },
    };

    const documentLines = solicitud.lineas.map((linea) => {
  const line = {
    ItemCode: linea.itemCode,
    ItemDescription: linea.description || "",
    Quantity: Number(linea.quantity),
    WarehouseCode: linea.warehouseCode || "01",
    RequiredDate: solicitud.requiredDate,
  };

  if (linea.costingCode) {
    line.CostingCode = linea.costingCode;
  }

  if (linea.projectCode) {
    line.ProjectCode = linea.projectCode;
  }

  if (linea.paqueteTrabajoId) {
    line.U_ALS_PAQTRAB = linea.paqueteTrabajoId;
  }

  if (linea.rubroId) {
    line.U_ALS_RUBRO = linea.rubroId;
  }

  return line;
});

    const payload = {
      DocDate: solicitud.docDate,
      RequriedDate: solicitud.requiredDate,
      Requester: solicitud.requester,
      Comments: solicitud.comments || "",
      DocCurrency: solicitud.docCurrency || "PEN",
      DocRate: solicitud.docRate || 1,

      ...(solicitud.branchId && {
        BPL_IDAssignedToInvoice: solicitud.branchId,
      }),

      DocumentLines: documentLines,
    };

    console.log("📦 Payload SAP:");
    console.log(JSON.stringify(payload, null, 2));

    // 🚀 Enviar a SAP
    const response = await sapAxios.post(
      "/PurchaseRequests",
      payload,
      config
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

      if (error.response.data?.error?.code === -2028) {
        console.error("💥 ERROR SAP -2028:");
        console.error("👉 Algún dato no existe en SAP:");
        console.error("- CostingCode");
        console.error("- ProjectCode");
        console.error("- WarehouseCode (si lo agregas luego)");
      }

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