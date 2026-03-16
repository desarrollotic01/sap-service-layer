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

async function getItemsSAP() {
  const cookie = await loginSAP();

  let items = [];
  let nextUrl =
    "/Items?$select=ItemCode,ItemName,ItemsGroupCode,PurchaseUnit,InventoryUOM,SalesUnit,Valid&$filter=Valid eq 'tYES'";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data || {};
    items = items.concat(Array.isArray(data.value) ? data.value : []);

    nextUrl = normalizarNextLink(
      data["@odata.nextLink"] || data["odata.nextLink"] || null
    );
  }

  return items;
}

module.exports = {
  getItemsSAP,
};