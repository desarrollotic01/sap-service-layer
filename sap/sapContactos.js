const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getContactosSAP() {
  const cookie = await loginSAP();

  let contactos = [];
  let nextUrl = "/Contacts";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data;
    contactos = contactos.concat(data.value || []);

    nextUrl = data["odata.nextLink"] || data["@odata.nextLink"] || null;
  }

  return contactos
    .map((c) => ({
      CardCode: String(c.CardCode || "").trim(),
      ContactCode: c.ContactCode ?? c.CntctCode ?? c.InternalCode ?? null,
      Name:
        c.Name ||
        [c.FirstName, c.MiddleName, c.LastName].filter(Boolean).join(" ").trim() ||
        "",
      E_Mail: c.E_Mail || c.E_MailL || null,
      Phone1: c.Phone1 || c.Tel1 || null,
      Cellular: c.Cellular || c.MobilePhone || c.Cellolar || null,
      Position: c.Position || null,
    }))
    .filter((c) => c.CardCode.startsWith("C"));
}

module.exports = {
  getContactosSAP,
};