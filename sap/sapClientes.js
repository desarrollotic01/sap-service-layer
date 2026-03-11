const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

function normalizarNextLink(nextLink) {
  if (!nextLink) return null;

  // Si viene URL completa, dejamos solo path + query
  if (nextLink.startsWith("http://") || nextLink.startsWith("https://")) {
    const url = new URL(nextLink);
    nextLink = `${url.pathname}${url.search}`;
  }

  // Si viene con /b1s/v1 o /b1s/v2, lo quitamos porque axios ya lo tiene en baseURL
  nextLink = nextLink.replace(/^\/b1s\/v\d\//, "/");

  return nextLink;
}

async function getClientesSAP() {
  const cookie = await loginSAP();

  let clientes = [];
  let nextUrl =
    "/BusinessPartners?$filter=CardType eq 'cCustomer'&$select=CardCode,CardName,Phone1,Cellular,EmailAddress,FederalTaxID,Address";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data;
    clientes = clientes.concat(data.value || []);

    nextUrl = normalizarNextLink(
      data["odata.nextLink"] || data["@odata.nextLink"] || null
    );
  }

  return clientes;
}

module.exports = {
  getClientesSAP,
};