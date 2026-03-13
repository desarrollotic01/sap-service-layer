require("dotenv").config();

const { Cliente, Contacto, Item, Rubro } = require("../db_connection");
const { getClientesSAP } = require("../sap/sapClientes");
const { getItemsSAP } = require("../sap/sapItems");
const { getRubrosSAP } = require("../sap/sapRubros");
const { getContactosSAP } = require("../sap/sapContactos");

async function syncRubros() {
  const rubrosSAP = await getRubrosSAP();

  for (const rubro of rubrosSAP) {
    await Rubro.upsert({
      sapCode: rubro.Number,
      nombre: rubro.GroupName,
      activo: true,
    });
  }

  console.log(`✅ Rubros sincronizados: ${rubrosSAP.length}`);
}

async function syncClientes() {
  const clientesSAP = await getClientesSAP();

  for (const bp of clientesSAP) {
    let cliente = await Cliente.findOne({
      where: { sapCode: bp.CardCode },
    });

    if (!cliente) {
      await Cliente.create({
        sapCode: bp.CardCode,
        razonSocial: bp.CardName || "",
        ruc: bp.FederalTaxID || null,
        direccion: bp.Address || null,
        telefono: bp.Phone1 || bp.Cellular || null,
        correo: bp.EmailAddress || null,
        tipoCliente: "SAP",
        activoSAP: true,
        estado: "Activo",
      });
    } else {
      await cliente.update({
        razonSocial: bp.CardName || cliente.razonSocial,
        ruc: bp.FederalTaxID || null,
        direccion: bp.Address || null,
        telefono: bp.Phone1 || bp.Cellular || null,
        correo: bp.EmailAddress || null,
        activoSAP: true,
        estado: "Activo",
      });
    }
  }

  console.log(`✅ Clientes sincronizados: ${clientesSAP.length}`);
}

async function syncItems() {
  const itemsSAP = await getItemsSAP();

  for (const item of itemsSAP) {
    await Item.upsert({
      sapCode: item.ItemCode,
      nombre: item.ItemName || "",
      rubroSapCode: item.ItemsGroupCode || null,
      unidadCompra: item.PurchaseUnit || null,
      unidadInventario: item.InventoryUOM || null,
      unidadVenta: item.SalesUnit || null,
      activoSAP: item.Valid === "tYES",
    });
  }

  console.log(`✅ Items sincronizados: ${itemsSAP.length}`);
}

async function syncContactos() {
  const contactosSAP = await getContactosSAP();

  console.log("====================================");
  console.log("TOTAL CONTACTOS SAP:", contactosSAP.length);
  console.log("MUESTRA CONTACTOS SAP:", contactosSAP.slice(0, 5));
  console.log("====================================");

  for (const c of contactosSAP) {
    try {
      const cardCode = String(c.CardCode || "").trim();

      if (!cardCode.startsWith("C")) {
        console.log("⏭️ Se omite contacto porque no es cliente:", cardCode);
        continue;
      }

      const cliente = await Cliente.findOne({
        where: { sapCode: cardCode },
      });

      console.log("BUSCANDO CLIENTE CON CardCode:", cardCode);
      console.log("CLIENTE ENCONTRADO:", cliente ? cliente.sapCode : null);

      if (!cliente) {
        console.log("⚠️ No se encontró cliente para contacto:", cardCode);
        continue;
      }

      const nombreNormalizado =
        String(c.Name || "").trim() || "SIN NOMBRE";

      const sapContactoId =
        c.ContactCode !== null && c.ContactCode !== undefined
          ? c.ContactCode
          : null;

      const correoNormalizado =
        String(c.E_Mail || "").trim() ||
        `sin-correo+${cardCode}-${sapContactoId ?? nombreNormalizado.replace(/\s+/g, "-").toLowerCase()}@placeholder.local`;

      const telefonoNormalizado =
        String(c.Phone1 || c.Cellular || "").trim() || "SIN TELEFONO";

      const cargoNormalizado =
        String(c.Position || "").trim() || "SIN CARGO";

      let contacto = null;

      if (sapContactoId !== null) {
        contacto = await Contacto.findOne({
          where: {
            clienteId: cliente.id,
            sapContactoId: sapContactoId,
          },
        });
      }

      if (!contacto) {
        contacto = await Contacto.findOne({
          where: {
            clienteId: cliente.id,
            nombre: nombreNormalizado,
            correo: correoNormalizado,
          },
        });
      }

      if (!contacto) {
        await Contacto.create({
          clienteId: cliente.id,
          sapContactoId: sapContactoId,
          nombre: nombreNormalizado,
          correo: correoNormalizado,
          telefono: telefonoNormalizado,
          cargo: cargoNormalizado,
          activo: true,
        });

        console.log(
          "✅ Contacto creado:",
          nombreNormalizado,
          "->",
          cliente.sapCode
        );
      } else {
        await contacto.update({
          nombre: nombreNormalizado,
          correo: correoNormalizado,
          telefono: telefonoNormalizado,
          cargo: cargoNormalizado,
          activo: true,
        });

        console.log(
          "♻️ Contacto actualizado:",
          nombreNormalizado,
          "->",
          cliente.sapCode
        );
      }
    } catch (error) {
      console.error("❌ Error procesando contacto:", c, error.message);
    }
  }

  console.log(`✅ Contactos sincronizados procesados: ${contactosSAP.length}`);
}


async function main() {
  try {
    await syncRubros();
    await syncClientes();
    await syncContactos();
    await syncItems();
    console.log("🎉 Sincronización SAP completada");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al sincronizar SAP:", error.response?.data || error.message);
    process.exit(1);
  }
}

main();