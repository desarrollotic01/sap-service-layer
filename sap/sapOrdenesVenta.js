const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

function normalizarNextLink(nextLink) {
  if (!nextLink) return null;

  if (nextLink.startsWith("http://") || nextLink.startsWith("https://")) {
    const url = new URL(nextLink);
    nextLink = `${url.pathname}${url.search}`;
  }

  nextLink = nextLink.replace(/^\/b1s\/v\d+\//, "/");

  return nextLink;
}

/**
 * 🔥 Obtener las Órdenes de Venta abiertas desde SAP (entidad "Orders" del Service Layer)
 * ⚠️ Verificar contra la instancia real de SAP: nombre de entidad y de campos
 * (DocEntry, DocNum, CardCode, CardName, DocDate, DocTotal, DocumentStatus) según versión de SAP B1.
 */
async function getOrdenesVentaSAP() {
  const cookie = await loginSAP();

  let ordenes = [];
  let nextUrl =
    "/Orders?$select=DocEntry,DocNum,CardCode,CardName,DocDate,DocTotal,DocumentStatus&$filter=DocumentStatus eq 'bost_Open'";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: { Cookie: cookie },
    });

    const data = response.data || {};
    const batch = Array.isArray(data.value) ? data.value : [];

    ordenes = ordenes.concat(batch);

    console.log(`🧾 Órdenes de Venta acumuladas: ${ordenes.length}`);

    nextUrl = normalizarNextLink(
      data["@odata.nextLink"] || data["odata.nextLink"] || null
    );
  }

  return ordenes;
}

module.exports = {
  getOrdenesVentaSAP,
};
