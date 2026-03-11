const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getRubrosSAP() {
  const cookie = await loginSAP();

  const response = await sapAxios.get("/ItemGroups", {
    headers: {
      Cookie: cookie,
    },
  });

  return response.data.value || [];
}

module.exports = {
  getRubrosSAP,
};