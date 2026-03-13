const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

function normalizarNextLink(nextLink) {
  if (!nextLink) return null;

  if (nextLink.startsWith("http://") || nextLink.startsWith("https://")) {
    const url = new URL(nextLink);
    nextLink = `${url.pathname}${url.search}`;
  }

  nextLink = nextLink.replace(/^\/b1s\/v\d+\//, "/");

  return nextLink;
}

function limpiarTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

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

    const data = response.data || {};
    const lote = Array.isArray(data.value) ? data.value : [];

    contactos = contactos.concat(lote);

    nextUrl = normalizarNextLink(
      data["odata.nextLink"] || data["@odata.nextLink"] || null
    );
  }

  console.log("====================================");
  console.log("MUESTRA RAW CONTACTOS SAP:");
  console.log(JSON.stringify(contactos.slice(0, 3), null, 2));
  console.log("====================================");

  return contactos.map((c) => ({
    CardCode: limpiarTexto(c.CardCode),
    ContactCode:
      c.ContactCode ??
      c.CntctCode ??
      c.InternalCode ??
      c.Code ??
      null,

    Name:
      limpiarTexto(c.Name) ||
      limpiarTexto(c.FirstName) ||
      limpiarTexto(c.LastName) ||
      limpiarTexto(c.FirstName && c.LastName
        ? `${c.FirstName} ${c.LastName}`
        : "") ||
      "SIN NOMBRE",

    E_Mail:
      limpiarTexto(c.E_Mail) ||
      limpiarTexto(c.E_MailL) ||
      limpiarTexto(c.Email) ||
      "",

    Phone1:
      limpiarTexto(c.Phone1) ||
      limpiarTexto(c.Tel1) ||
      limpiarTexto(c.Phone) ||
      "",

    Cellular:
      limpiarTexto(c.Cellular) ||
      limpiarTexto(c.MobilePhone) ||
      limpiarTexto(c.Cellolar) ||
      "",

    Position:
      limpiarTexto(c.Position) ||
      limpiarTexto(c.Title) ||
      "",
  }))
  .filter((c) => c.CardCode.startsWith("C"));
}

module.exports = {
  getContactosSAP,
};