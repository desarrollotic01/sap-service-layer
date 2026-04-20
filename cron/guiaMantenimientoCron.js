const cron = require("node-cron");
const { Op } = require("sequelize");
const {
  sequelize,
  GuiaMantenimientoProgramacion,
  GuiaMantenimiento,
  Aviso,
  AvisoEquipo,
  AvisoUbicacion,
} = require("../db_connection");

const buildNumeroAviso = async (t) => {
  const year = new Date().getFullYear();
  const prefix = `AV-${year}-`;
  const last = await Aviso.findOne({
    where: { numeroAviso: { [Op.like]: `${prefix}%` } },
    order: [["createdAt", "DESC"]],
    transaction: t,
  });
  let nextN = 1;
  if (last?.numeroAviso) {
    const num = parseInt(String(last.numeroAviso).replace(prefix, ""), 10);
    if (Number.isFinite(num)) nextN = num + 1;
  }
  return `${prefix}${String(nextN).padStart(5, "0")}`;
};

const prioridadFromCreticidad = (c) =>
  c === "A" ? "Alta" : c === "B" ? "Media" : "Baja";

// Corre cada hora: marca programaciones vencidas
const jobMarcarVencidas = async () => {
  try {
    const now = new Date();
    const list = await GuiaMantenimientoProgramacion.findAll({
      where: {
        state: true,
        estado: "PENDIENTE",
        fechaProgramada: { [Op.lt]: now },
      },
    });
    if (!list.length) return;
    await sequelize.transaction(async (t) => {
      for (const p of list) {
        await p.update({ estado: "VENCIDO" }, { transaction: t });
      }
    });
    console.log(`[CRON] Marcadas ${list.length} programaciones como VENCIDO`);
  } catch (err) {
    console.error("[CRON] Error en jobMarcarVencidas:", err.message);
  }
};

// Corre cada 15 minutos: crea avisos cuando llega la fecha de alerta
const jobCrearAvisosAlerta = async () => {
  try {
    const now = new Date();
    const programaciones = await GuiaMantenimientoProgramacion.findAll({
      where: {
        state: true,
        estado: "PENDIENTE",
        alertaDisparada: false,
        fechaAlertaCalculada: { [Op.lte]: now },
      },
      include: [{ model: GuiaMantenimiento, as: "guia" }],
      order: [["fechaAlertaCalculada", "ASC"]],
    });

    if (!programaciones.length) return;

    let creados = 0;
    await sequelize.transaction(async (t) => {
      for (const prog of programaciones) {
        const guia = prog.guia;
        if (!guia || !guia.state || !guia.alertaActiva) continue;

        const numeroAviso = await buildNumeroAviso(t);
        const aviso = await Aviso.create(
          {
            tipoAviso: "mantenimiento",
            origenAviso: "guia",
            guiaMantenimientoId: guia.id,
            guiaMantenimientoProgramacionId: prog.id,
            ordenVenta: guia.ordenVenta,
            numeroAviso,
            descripcionResumida: guia.descripcion,
            descripcion: guia.descripcionDetallada || guia.descripcion,
            prioridad: prioridadFromCreticidad(guia.creticidad),
            tipoMantenimiento: "Preventivo",
            producto: guia.producto,
            fechaAtencion: prog.fechaProgramada,
            paisId: guia.paisId,
            creadoPor: guia.solicitanteId,
            solicitanteId: guia.solicitanteId,
            estadoAviso: "creado",
            documentos: [],
          },
          { transaction: t }
        );

        if (guia.equipoId) {
          await AvisoEquipo.create(
            { avisoId: aviso.id, equipoId: guia.equipoId },
            { transaction: t }
          );
        }
        if (guia.ubicacionTecnicaId) {
          await AvisoUbicacion.create(
            { avisoId: aviso.id, ubicacionId: guia.ubicacionTecnicaId },
            { transaction: t }
          );
        }

        await prog.update(
          { alertaDisparada: true, avisoId: aviso.id },
          { transaction: t }
        );
        creados++;
      }
    });

    if (creados > 0)
      console.log(`[CRON] Creados ${creados} avisos desde alertas de guías`);
  } catch (err) {
    console.error("[CRON] Error en jobCrearAvisosAlerta:", err.message);
  }
};

const initCronJobs = () => {
  // Marcar vencidas: cada hora (minuto 0)
  cron.schedule("0 * * * *", jobMarcarVencidas, {
    scheduled: true,
    timezone: "America/Lima",
  });

  // Crear avisos alertas: cada 15 minutos
  cron.schedule("*/15 * * * *", jobCrearAvisosAlerta, {
    scheduled: true,
    timezone: "America/Lima",
  });

  console.log("[CRON] Jobs de guía de mantenimiento iniciados ✓");

  // Ejecutar inmediatamente al iniciar para no esperar el primer tick
  jobMarcarVencidas();
  jobCrearAvisosAlerta();
};

module.exports = { initCronJobs };
