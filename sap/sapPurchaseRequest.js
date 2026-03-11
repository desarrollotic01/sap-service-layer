const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

const createPurchaseRequestSAP = async (payload) => {
  const cookie = await loginSAP();

  const response = await sapAxios.post("/PurchaseRequests", payload, {
    headers: {
      Cookie: cookie,
    },
  });

  return response.data;
};

module.exports = {
  createPurchaseRequestSAP,
};