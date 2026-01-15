const axios = require("axios");

const createPurchaseRequest = async (payload) => {
  const response = await axios.post(
    `${process.env.GATEWAY_URL}/purchase-request`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${process.env.GATEWAY_TOKEN}`,
      },
    }
  );

  return response.data;
};

module.exports = {
  createPurchaseRequest,
};
