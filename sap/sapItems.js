const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getItemsSAP() {
  const cookie = await loginSAP();

  const response = await sapAxios.get(
    "/Items?$select=ItemCode,ItemName,ItemsGroupCode,PurchaseUnit,InventoryUOM,SalesUnit,Valid",
    {
      headers: {
        Cookie: cookie,
      },
    }
  );

  return response.data.value || [];
}

module.exports = {
  getItemsSAP,
};