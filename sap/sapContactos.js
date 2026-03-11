const sapAxios = require("./sapClient");
const { loginSAP } = require("./sapAuth");

async function getContactosSAP() {
  const cookie = await loginSAP();

  const sqlName = "qry_contactos_clientes";

  const sqlBody = {
    SqlCode: sqlName,
    SqlName: "Contactos clientes",
    SqlText: `
      SELECT
        T0."CardCode"   AS "CardCode",
        T0."CntctCode"  AS "ContactCode",
        T0."Name"       AS "Name",
        T0."Position"   AS "Position",
        T0."Tel1"       AS "Phone1",
        T0."Cellolar"   AS "Cellular",
        T0."E_MailL"    AS "E_Mail",
        T0."Active"     AS "Active"
      FROM OCPR T0
    `,
  };

  try {
    // intenta crearlo
    await sapAxios.post("/SQLQueries", sqlBody, {
      headers: { Cookie: cookie },
    });
  } catch (err) {
    // si ya existe, actualízalo
    const sapMsg = err?.response?.data?.error?.message?.value || "";
    if (
      err?.response?.status === 409 ||
      sapMsg.toLowerCase().includes("already exists")
    ) {
      await sapAxios.patch(`/SQLQueries('${sqlName}')`, sqlBody, {
        headers: { Cookie: cookie },
      });
    } else {
      throw err;
    }
  }

  const response = await sapAxios.get(
    `/SQLQueries('${sqlName}')/List`,
    {
      headers: { Cookie: cookie },
    }
  );

  const rows = response.data?.value || [];

  return rows
    .filter((c) => !c.Active || c.Active === "Y")
    .map((c) => ({
      CardCode: c.CardCode,
      ContactCode: c.ContactCode,
      Name: c.Name || "",
      E_Mail: c.E_Mail || null,
      Phone1: c.Phone1 || null,
      Cellular: c.Cellular || null,
      Position: c.Position || null,
    }));
}

module.exports = {
  getContactosSAP,
};