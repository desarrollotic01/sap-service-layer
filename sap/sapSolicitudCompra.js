const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

/**
 * Cache simple (opcional pero recomendado)
 */
let cache = {
  costCenters: null,
  projects: null,
  lastLoad: null,
};

const CACHE_TTL = 1000 * 60 * 10; // 10 min

async function getCatalogosSAP(cookies) {
  const now = Date.now();

  if (
    cache.costCenters &&
    cache.projects &&
    cache.lastLoad &&
    now - cache.lastLoad < CACHE_TTL
  ) {
    return cache;
  }

  console.log("🔄 Cargando catálogos desde SAP...");

  const config = {
    headers: {
      Cookie: cookies,
    },
  };

  const [costCentersRes, projectsRes] = await Promise.all([
    sapAxios.get("/ProfitCenters", config),
    sapAxios.get("/Projects", config),
  ]);

  cache = {
    costCenters: new Set(
      costCentersRes.data.value.map((c) => c.Code)
    ),
    projects: new Set(
      projectsRes.data.value.map((p) => p.Code)
    ),
    lastLoad: now,
  };

  return cache;
}

/**
 * Construye líneas VALIDADAS para SAP
 */
function buildDocumentLines(lineas, catalogos) {
  return lineas.map((linea, index) => {
    const line = {
      ItemCode: linea.itemCode,
      ItemDescription: linea.description || "",
      Quantity: Number(linea.quantity),
    };

    // ✅ VALIDAR COST CENTER
    if (linea.costingCode) {
      if (catalogos.costCenters.has(linea.costingCode)) {
        line.CostingCode = linea.costingCode;
      } else {
        console.warn(
          `❌ Línea ${index + 1}: CostingCode inválido →`,
          linea.costingCode
        );
      }
    }

    // ✅ VALIDAR PROJECT
    if (linea.projectCode) {
      if (catalogos.projects.has(linea.projectCode)) {
        line.ProjectCode = linea.projectCode;
      } else {
        console.warn(
          `❌ Línea ${index + 1}: ProjectCode inválido →`,
          linea.projectCode
        );
      }
    }

    // ✅ CAMPOS UDF (IMPORTANTE)
    if (linea.paqueteTrabajoId) {
      line.U_ALS_PAQTRAB = linea.paqueteTrabajoId;
    }

    if (linea.rubroId) {
      line.U_ALS_RUBRO = linea.rubroId;
    }

    return line;
  });
}

/**
 * Enviar solicitud de compra a SAP
 */
async function enviarSolicitudCompra(solicitud) {
  try {
    const cookies = await loginSAP();

    // 🔥 Obtener catálogos válidos
    const catalogos = await getCatalogosSAP();

    // 🔥 Construir líneas seguras
    const documentLines = buildDocumentLines(
      solicitud.lineas,
      catalogos
    );

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

      // 🔥 MANEJO ESPECÍFICO SAP
      if (error.response.data?.error?.code === -2028) {
        console.error("💥 SAP ERROR -2028: Datos maestros inválidos");

        console.error("👉 Verifica:");
        console.error("- CostingCode");
        console.error("- ProjectCode");
        console.error("- Dimensiones activas");
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