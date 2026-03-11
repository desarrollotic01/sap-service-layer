const sapAxios = require("./sapClient");

async function loginSAP() {
  const response = await sapAxios.post("/Login", {
    CompanyDB: process.env.SAP_COMPANY_DB,
    UserName: process.env.SAP_USER,
    Password: process.env.SAP_PASSWORD,
  });

  const cookies = response.headers["set-cookie"] || [];

  if (!cookies.length) {
    throw new Error("No se recibieron cookies de sesión desde SAP.");
  }

  return cookies.join("; ");
}

module.exports = {
  loginSAP,
};