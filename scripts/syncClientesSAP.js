const axios = require("axios");
const https = require("https");
const { Cliente, Contacto } = require("../db_connection");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const SAP_URL = process.env.SAP_URL;

async function loginSAP() {
  const response = await axios.post(
    `${SAP_URL}/Login`,
    {
      CompanyDB: process.env.SAP_COMPANY_DB,
      UserName: process.env.SAP_USER,
      Password: process.env.SAP_PASSWORD,
    },
    { httpsAgent }
  );

  return response.headers["set-cookie"];
}

async function syncClientes() {
  const cookies = await loginSAP();

  const res = await axios.get(
    `${SAP_URL}/BusinessPartners?$filter=CardType eq 'cCustomer'`,
    {
      httpsAgent,
      headers: {
        Cookie: cookies.join("; "),
      },
    }
  );

  for (const bp of res.data.value) {
    const [cliente] = await Cliente.upsert({
      sapCode: bp.CardCode,
      razonSocial: bp.CardName,
      ruc: bp.FederalTaxID,
      telefono: bp.Phone1,
      correo: bp.EmailAddress,
      direccion: bp.Address,
    });

    if (bp.ContactEmployees) {
      for (const contacto of bp.ContactEmployees) {
        await Contacto.upsert({
          sapContactoId: contacto.InternalCode,
          clienteId: cliente.id,
          nombre: contacto.Name,
          correo: contacto.E_Mail,
          telefono: contacto.MobilePhone,
          cargo: contacto.Position,
        });
      }
    }
  }

  console.log("Clientes sincronizados correctamente");
}

syncClientes();