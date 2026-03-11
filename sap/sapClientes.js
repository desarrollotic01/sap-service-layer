const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getClientesSAP() {
  const cookie = await loginSAP();

  const response = await sapAxios.get(
    "/BusinessPartners?$filter=CardType eq 'cCustomer'&$select=CardCode,CardName,Phone1,Cellular,EmailAddress,FederalTaxID,Address&$expand=ContactEmployees",
    {
      headers: {
        Cookie: cookie,
      },
    }
  );

  return response.data.value || [];
}

module.exports = {
  getClientesSAP,
};