const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getContactosSAP() {
  const cookie = await loginSAP();

  const response = await sapAxios.get("/Contacts", {
    headers: {
      Cookie: cookie,
    },
  });

  return response.data.value || [];
}

module.exports = {
  getContactosSAP,
};