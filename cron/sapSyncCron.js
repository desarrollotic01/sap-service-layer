const cron = require("node-cron");
const { syncClientes, syncContactos, syncRubros, sincronizarCatalogosSAP } = require("../scripts/syncCatalogosSAP");

const jobSyncSAP = async () => {
  console.log(`[SAP-SYNC] Iniciando sincronización automática ${new Date().toISOString()}`);
  try {
    await sincronizarCatalogosSAP();
    await syncRubros();
    await syncClientes();
    await syncContactos();
    console.log(`[SAP-SYNC] ✓ Sincronización completada ${new Date().toISOString()}`);
  } catch (err) {
    console.error("[SAP-SYNC] ❌ Error en sincronización:", err.message);
  }
};

const initSapSyncCron = () => {
  // Cada 20 minutos — solo upsert, nunca borra sedes ni datos locales
  cron.schedule("*/20 * * * *", jobSyncSAP, {
    scheduled: true,
    timezone: "America/Lima",
  });

  console.log("[SAP-SYNC] Cron de sincronización SAP iniciado (cada 20 min) ✓");
};

module.exports = { initSapSyncCron };
