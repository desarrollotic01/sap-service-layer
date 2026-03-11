const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getContactosSAP() {
  const cookie = await loginSAP();

  const response = await sapAxios.get(
    "/BusinessPartners?$select=CardCode,CardName&$expand=ContactEmployees",
    {
      headers: {
        Cookie: cookie,
      },
    }
  );

  const businessPartners = response.data.value || [];

  const contactos = [];

  for (const bp of businessPartners) {
    const lista = bp.ContactEmployees || [];

    for (const c of lista) {
      contactos.push({
        CardCode: bp.CardCode,
        ContactCode: c.InternalCode ?? null,
        Name: [c.FirstName, c.MiddleName, c.LastName]
          .filter(Boolean)
          .join(" ")
          .trim() || c.Name || "",
        E_Mail: c.E_Mail || null,
        Phone1: c.Phone1 || null,
        Cellular: c.MobilePhone || null,
        Position: c.Position || null,
      });
    }
  }

  return contactos;
}

module.exports = {
  getContactosSAP,
};