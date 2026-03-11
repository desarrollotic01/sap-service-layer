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

async function syncClientesYContactos() {
  const clientesSAP = await getClientesSAP();

  for (const bp of clientesSAP) {
    let cliente = await Cliente.findOne({
      where: { sapCode: bp.CardCode },
    });

    if (!cliente) {
      cliente = await Cliente.create({
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

    if (Array.isArray(bp.ContactEmployees)) {
      for (const c of bp.ContactEmployees) {
        if (!c || !c.Name) continue;

        const contactoExistente = await Contacto.findOne({
          where: {
            clienteId: cliente.id,
            sapContactoId: c.InternalCode || null,
          },
        });

        if (!contactoExistente) {
          await Contacto.create({
            clienteId: cliente.id,
            sapContactoId: c.InternalCode || null,
            nombre: c.Name,
            correo: c.E_Mail || null,
            telefono: c.MobilePhone || c.Phone1 || null,
            cargo: c.Position || null,
            activo: true,
          });
        } else {
          await contactoExistente.update({
            nombre: c.Name,
            correo: c.E_Mail || null,
            telefono: c.MobilePhone || c.Phone1 || null,
            cargo: c.Position || null,
            activo: true,
          });
        }
      }
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

  for (const c of contactosSAP) {
    const cliente = await Cliente.findOne({
      where: { sapCode: c.CardCode },
    });

    if (!cliente) continue;

    let contacto = await Contacto.findOne({
      where: {
        clienteId: cliente.id,
        nombre: c.Name,
      },
    });

    if (!contacto) {
      await Contacto.create({
        clienteId: cliente.id,
        nombre: c.Name,
        correo: c.E_Mail || null,
        telefono: c.Phone1 || null,
        cargo: c.Position || null,
        activo: true,
      });
    } else {
      await contacto.update({
        correo: c.E_Mail || null,
        telefono: c.Phone1 || null,
        cargo: c.Position || null,
      });
    }
  }

  console.log(`✅ Contactos sincronizados: ${contactosSAP.length}`);
}

async function main() {
  try {
    await syncRubros();
    await syncClientesYContactos();
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