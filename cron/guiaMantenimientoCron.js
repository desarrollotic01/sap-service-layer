const cron = require("node-cron");
const { Op } = require("sequelize");
const {
  sequelize,
  GuiaMantenimientoProgramacion,
  GuiaMantenimiento,
  PlanMantenimiento,
  Aviso,
  AvisoEquipo,
  AvisoUbicacion,
} = require("../db_connection");
const { siguienteNumero } = require("../utils/contadores");
const { AddFrequency } = require("../utils/guiaMantenimientoFechas");
const { SubtractAnticipacion } = require("../utils/guiaMantenimientoAlertas");

// io se inyecta una vez que el servidor arranca
let _io = null;
const setIo = (io) => { _io = io; };
const emitNuevasAlertas = (count) => {
  if (_io && count > 0) _io.emit("nuevas_alertas_guia", { count });
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
    console.log(`[CRON] jobCrearAvisosAlerta ejecutando a ${now.toISOString()}`);

    // Diagnóstico: ver cuántas programaciones hay sin filtro de fecha
    const totalPendientes = await GuiaMantenimientoProgramacion.count({
      where: { state: true, alertaDisparada: false, estado: { [Op.in]: ["PENDIENTE", "VENCIDO"] } },
    });
    console.log(`[CRON] Programaciones pendientes sin filtro de fecha: ${totalPendientes}`);

    const programaciones = await GuiaMantenimientoProgramacion.findAll({
      where: {
        state: true,
        estado: { [Op.in]: ["PENDIENTE", "VENCIDO"] },
        alertaDisparada: false,
        fechaAlertaCalculada: { [Op.lte]: now },
      },
      include: [
        {
          model: GuiaMantenimiento,
          as: "guia",
          include: [{ model: PlanMantenimiento, as: "planMantenimiento" }],
        },
      ],
      order: [["fechaAlertaCalculada", "ASC"]],
    });

    console.log(`[CRON] Programaciones con fechaAlerta <= ahora: ${programaciones.length}`);

    if (!programaciones.length) {
      // Mostrar las próximas fechas para diagnóstico
      const proximas = await GuiaMantenimientoProgramacion.findAll({
        where: { state: true, alertaDisparada: false },
        attributes: ["id", "fechaAlertaCalculada", "fechaProgramada", "estado"],
        order: [["fechaAlertaCalculada", "ASC"]],
        limit: 5,
      });
      if (proximas.length) {
        console.log(`[CRON] Próximas alertas pendientes:`);
        proximas.forEach(p => console.log(`  - fechaAlerta: ${p.fechaAlertaCalculada} | fechaProgramada: ${p.fechaProgramada} | estado: ${p.estado}`));
      }
      return;
    }

    let creados = 0;
    await sequelize.transaction(async (t) => {
      for (const prog of programaciones) {
        const guia = prog.guia;
        if (!guia || !guia.state || !guia.alertaActiva) {
          console.log(`[CRON] Saltando prog ${prog.id}: guia.state=${guia?.state} alertaActiva=${guia?.alertaActiva}`);
          continue;
        }

        const numeroAviso = await siguienteNumero("AV", "AV", 3, t);
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
          await AvisoEquipo.create({ avisoId: aviso.id, equipoId: guia.equipoId }, { transaction: t });
        }
        if (guia.ubicacionTecnicaId) {
          await AvisoUbicacion.create({ avisoId: aviso.id, ubicacionId: guia.ubicacionTecnicaId }, { transaction: t });
        }

        // Marcar programación actual como disparada y ejecutada
        await prog.update(
          { alertaDisparada: true, avisoId: aviso.id, estado: "EJECUTADO" },
          { transaction: t }
        );

        // ─── Generar la siguiente programación del ciclo ─────────────────────
        const plan = guia.planMantenimiento;
        if (plan && guia.periodoActivo) {
          try {
            const nextFechaProgramada = AddFrequency(
              prog.fechaProgramada,
              plan.frecuencia,
              plan.frecuenciaHoras
            );
            const nextFechaAlerta =
              guia.tipoAnticipacionAlerta && guia.valorAnticipacionAlerta
                ? SubtractAnticipacion(nextFechaProgramada, guia.tipoAnticipacionAlerta, guia.valorAnticipacionAlerta)
                : null;

            await GuiaMantenimientoProgramacion.create(
              {
                guiaMantenimientoId: guia.id,
                fechaProgramada: nextFechaProgramada,
                fechaAlertaCalculada: nextFechaAlerta,
                alertaDisparada: false,
                estado: "PENDIENTE",
                state: true,
              },
              { transaction: t }
            );
            console.log(`[CRON] Nueva programación creada para guia ${guia.id}: ${nextFechaProgramada.toISOString()}`);
          } catch (err) {
            console.warn(`[CRON] No se pudo crear siguiente programación para guia ${guia.id}: ${err.message}`);
          }
        }

        creados++;
        console.log(`[CRON] Aviso ${numeroAviso} creado para guia ${guia.id} (prog ${prog.id})`);
      }
    });

    if (creados > 0) {
      console.log(`[CRON] ✓ Creados ${creados} avisos desde alertas de guías`);
      emitNuevasAlertas(creados);
    }
  } catch (err) {
    console.error("[CRON] Error en jobCrearAvisosAlerta:", err.message, err.stack);
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

module.exports = { initCronJobs, setIo };
