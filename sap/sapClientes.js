const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

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

    nextUrl = data["odata.nextLink"] || data["@odata.nextLink"] || null;
  }

  return clientes;
}

module.exports = {
  getClientesSAP,
};