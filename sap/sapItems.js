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
 * 🔥 Obtener TODOS los items activos (MASIVO y RÁPIDO)
 */
async function getItemsSAP() {
  const cookie = await loginSAP();

  let items = [];
  let nextUrl =
    "/Items?$select=ItemCode,ItemName,ItemsGroupCode,PurchaseUnit,InventoryUOM,SalesUnit,Valid&$filter=Valid eq 'tYES'";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: { Cookie: cookie },
    });

    const data = response.data || {};
    const batch = Array.isArray(data.value) ? data.value : [];

    items = items.concat(batch);

    console.log(`📦 Items acumulados: ${items.length}`);

    nextUrl = normalizarNextLink(
      data["@odata.nextLink"] || data["odata.nextLink"] || null
    );
  }

  return items;
}

/**
 * 🔥 Obtener warehouses de UN item (SOLO cuando se necesite)
 */
async function getItemWarehouses(itemCode) {
  try {
    const cookie = await loginSAP();

    const response = await sapAxios.get(`/Items('${itemCode}')`, {
      headers: { Cookie: cookie },
    });

    return response.data?.ItemWarehouseInfoCollection || [];
  } catch (error) {
    console.error(`❌ Error obteniendo warehouses de ${itemCode}`);
    return [];
  }
}

/**
 * 🔥 OPCIONAL PRO: traer SOLO warehouses con stock
 */
async function getWarehousesWithStock(itemCode) {
  const warehouses = await getItemWarehouses(itemCode);

  return warehouses.filter((w) => w.InStock > 0);
}

module.exports = {
  getItemsSAP,
  getItemWarehouses,
  getWarehousesWithStock, // opcional
};