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

  let businessPartners = [];
  let nextUrl =
    "/BusinessPartners?$select=CardCode,CardType,ContactEmployees";

  while (nextUrl) {
    const response = await sapAxios.get(nextUrl, {
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data || {};
    const lote = Array.isArray(data.value) ? data.value : [];

    businessPartners = businessPartners.concat(lote);

    nextUrl = normalizarNextLink(
      data["odata.nextLink"] || data["@odata.nextLink"] || null
    );
  }

  const contactos = [];

  for (const bp of businessPartners) {
    const cardCode = limpiarTexto(bp.CardCode);

    if (!cardCode.startsWith("C")) continue;

    const contactosBP = Array.isArray(bp.ContactEmployees)
      ? bp.ContactEmployees
      : [];

    for (const c of contactosBP) {
      const nombreCompleto = [
        limpiarTexto(c.FirstName),
        limpiarTexto(c.MiddleName),
        limpiarTexto(c.LastName),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      contactos.push({
        CardCode: cardCode,
        ContactCode:
          c.InternalCode ??
          c.ContactCode ??
          c.CntctCode ??
          null,
        Name:
          limpiarTexto(c.Name) ||
          nombreCompleto ||
          "SIN NOMBRE",
        E_Mail:
          limpiarTexto(c.E_Mail) ||
          limpiarTexto(c.E_MailL) ||
          limpiarTexto(c.EmailAddress) ||
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
      });
    }
  }

  console.log("====================================");
  console.log("TOTAL CONTACTOS BP SAP:", contactos.length);
  console.log("MUESTRA CONTACTOS BP SAP:", contactos.slice(0, 10));
  console.log("====================================");

  return contactos;
}

module.exports = {
  getContactosSAP,
};