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
  let nextUrl =
    "/Contacts?$select=CardCode,ContactCode,CntctCode,InternalCode,Name,FirstName,MiddleName,LastName,E_Mail,E_MailL,Phone1,Tel1,Cellular,MobilePhone,Cellolar,Position";

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

  return contactos
    .map((c) => {
      const cardCode = limpiarTexto(c.CardCode);

      const nombreCompleto = [
        limpiarTexto(c.FirstName),
        limpiarTexto(c.MiddleName),
        limpiarTexto(c.LastName),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        CardCode: cardCode,
        ContactCode: c.ContactCode ?? c.CntctCode ?? c.InternalCode ?? null,
        Name: limpiarTexto(c.Name) || nombreCompleto || "",
        E_Mail: limpiarTexto(c.E_Mail) || limpiarTexto(c.E_MailL) || "",
        Phone1: limpiarTexto(c.Phone1) || limpiarTexto(c.Tel1) || "",
        Cellular:
          limpiarTexto(c.Cellular) ||
          limpiarTexto(c.MobilePhone) ||
          limpiarTexto(c.Cellolar) ||
          "",
        Position: limpiarTexto(c.Position) || "",
      };
    })
    .filter((c) => c.CardCode.startsWith("C"));
}

module.exports = {
  getContactosSAP,
};