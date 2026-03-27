// services/sapSolicitudCompra.js

const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

const {
  SolicitudCompra,
  SolicitudCompraLinea,
  SapRubro,
  SapPaqueteTrabajo,
} = require("../db_connection");

/* =========================
   FORMATEAR FECHA SAP
========================= */
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
};

/* =========================
   OBTENER SOLICITUD COMPLETA
========================= */
const obtenerSolicitudCompleta = async (solicitudId) => {
  const solicitud = await SolicitudCompra.findByPk(solicitudId, {
    include: [
      {
        model: SolicitudCompraLinea,
        as: "lineas",
        include: [
          {
            model: SapRubro,
            as: "rubro",
          },
          {
            model: SapPaqueteTrabajo,
            as: "paqueteTrabajo",
          },
        ],
      },
    ],
  });

  if (!solicitud) {
    throw new Error("Solicitud no encontrada");
  }

  return solicitud;
};

/* =========================
   MAPEAR A JSON SAP
========================= */
const mapearSolicitudASAP = (solicitud) => {
  if (!solicitud.lineas || solicitud.lineas.length === 0) {
    throw new Error("La solicitud no tiene líneas");
  }

  const documentLines = solicitud.lineas.map((linea, index) => {
    // 🔴 VALIDACIONES
    if (!linea.itemCode) {
      throw new Error(`Línea ${index + 1}: itemCode es obligatorio`);
    }

    if (!linea.quantity || Number(linea.quantity) <= 0) {
      throw new Error(`Línea ${index + 1}: quantity inválido`);
    }

    if (!linea.rubro || !linea.rubro.codigo) {
      throw new Error(`Línea ${index + 1}: rubro sin código SAP`);
    }

    if (!linea.paqueteTrabajo || !linea.paqueteTrabajo.codigo) {
      throw new Error(`Línea ${index + 1}: paqueteTrabajo sin código SAP`);
    }

    return {
      ItemCode: linea.itemCode,
      Quantity: Number(linea.quantity),
      RequiredDate: formatDate(solicitud.requiredDate),

      ...(linea.warehouseCode && {
        WarehouseCode: linea.warehouseCode,
      }),

      ...(linea.costingCode && {
        CostingCode: linea.costingCode,
      }),

      ...(linea.projectCode && {
        ProjectCode: linea.projectCode,
      }),

      // 🔥 LO IMPORTANTE
      U_ALS_PAQTRAB: linea.paqueteTrabajo.codigo,
      U_ALS_RUBRO: linea.rubro.codigo,
    };
  });

  return {
    DocDate: formatDate(solicitud.docDate),
    RequriedDate: formatDate(solicitud.requiredDate),
    DocumentLines: documentLines,
  };
};

/* =========================
   ENVIAR A SAP
========================= */
const enviarSolicitudCompraASAP = async (solicitudId) => {
  try {
    // 1. traer solicitud completa
    const solicitud = await obtenerSolicitudCompleta(solicitudId);

    // 2. mapear a formato SAP
    const payload = mapearSolicitudASAP(solicitud);

    // 3. login SAP
    const cookies = await loginSAP();

    const config = {
      headers: {
        Cookie: cookies,
      },
    };

    console.log("📦 Payload SAP:");
    console.log(JSON.stringify(payload, null, 2));

    // 4. enviar
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
        console.error("👉 Algún código no existe en SAP:");
        console.error("- CostingCode");
        console.error("- ProjectCode");
        console.error("- WarehouseCode");
        console.error("- U_ALS_RUBRO");
        console.error("- U_ALS_PAQTRAB");
      }

    } else {
      console.error(error.message);
    }

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};


/* =========================
   🔥 NUEVO: ENVIAR DESDE OBJETO (FUSIONADO)
========================= */
const enviarSolicitudCompraASAPDesdeObjeto = async (solicitudFusionada) => {
  try {
    if (!solicitudFusionada.lineas?.length) {
      throw new Error("No hay líneas para enviar a SAP");
    }

    const documentLines = [];

    for (let i = 0; i < solicitudFusionada.lineas.length; i++) {
      const linea = solicitudFusionada.lineas[i];


      const rubroIds = [...new Set(solicitudFusionada.lineas.map(l => l.rubroId))];
const paqueteIds = [...new Set(solicitudFusionada.lineas.map(l => l.paqueteTrabajoId))];

const rubros = await SapRubro.findAll({
  where: { id: rubroIds }
});

const paquetes = await SapPaqueteTrabajo.findAll({
  where: { id: paqueteIds }
});

// mapas rápidos
const rubroMap = new Map(rubros.map(r => [r.id, r]));
const paqueteMap = new Map(paquetes.map(p => [p.id, p]));

      const rubro = rubroMap.get(linea.rubroId);
const paquete = paqueteMap.get(linea.paqueteTrabajoId);

      if (!rubro?.codigo) {
        throw new Error(`Línea ${i + 1}: rubro sin código SAP`);
      }

      if (!paquete?.codigo) {
        throw new Error(`Línea ${i + 1}: paquete sin código SAP`);
      }

      documentLines.push({
        ItemCode: linea.itemCode,
        Quantity: Number(linea.quantity),
        RequiredDate: formatDate(new Date()),

        ...(linea.warehouseCode && {
          WarehouseCode: linea.warehouseCode,
        }),

        ...(linea.costingCode && {
          CostingCode: linea.costingCode,
        }),

        ...(linea.projectCode && {
          ProjectCode: linea.projectCode,
        }),

        U_ALS_PAQTRAB: paquete.codigo,
        U_ALS_RUBRO: rubro.codigo,
      });
    }

    const payload = {
      DocDate: formatDate(new Date()),
      RequriedDate: formatDate(new Date()),
      DocumentLines: documentLines,
    };

    const cookies = await loginSAP();

    const response = await sapAxios.post(
      "/PurchaseRequests",
      payload,
      {
        headers: { Cookie: cookies },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

module.exports = {
  enviarSolicitudCompraASAP,
  enviarSolicitudCompraASAPDesdeObjeto
};