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
 * 🔥 Obtener los Proyectos SAP (módulo Project Management, tabla OPRJ)
 * Alsud usa el Código de Proyecto de SAP como "Orden de Venta" del aviso.
 */
async function getOrdenesVentaSAP() {
  const cookie = await loginSAP();

  let proyectos = [];
  let nextUrl = "/Projects?$select=Code,Name";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: { Cookie: cookie },
    });

    const data = response.data || {};
    const batch = Array.isArray(data.value) ? data.value : [];

    proyectos = proyectos.concat(batch);

    console.log(`🧾 Proyectos SAP (Orden de Venta) acumulados: ${proyectos.length}`);

    nextUrl = normalizarNextLink(
      data["@odata.nextLink"] || data["odata.nextLink"] || null
    );
  }

  return proyectos;
}

module.exports = {
  getOrdenesVentaSAP,
};
