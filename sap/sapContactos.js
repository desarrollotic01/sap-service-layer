const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getContactosSAP() {
  const cookie = await loginSAP();

  // 1. Traer clientes
  const bpResponse = await sapAxios.get("/BusinessPartners?$select=CardCode,CardName", {
    headers: {
      Cookie: cookie,
    },
  });

  const businessPartners = bpResponse.data.value || [];
  const contactos = [];

  // 2. Leer cada cliente por separado
  for (const bp of businessPartners) {
    try {
      const detalle = await sapAxios.get(`/BusinessPartners('${bp.CardCode}')`, {
        headers: {
          Cookie: cookie,
        },
      });

      const lista = detalle.data.ContactEmployees || [];

      for (const c of lista) {
        contactos.push({
          CardCode: bp.CardCode,
          ContactCode: c.InternalCode ?? null,
          Name:
            [c.FirstName, c.MiddleName, c.LastName]
              .filter(Boolean)
              .join(" ")
              .trim() || c.Name || "",
          E_Mail: c.E_Mail || null,
          Phone1: c.Phone1 || null,
          Cellular: c.MobilePhone || null,
          Position: c.Position || null,
        });
      }
    } catch (err) {
      console.error(`Error leyendo contactos de ${bp.CardCode}:`, err.response?.data || err.message);
    }
  }

  return contactos;
}

module.exports = {
  getContactosSAP,
};