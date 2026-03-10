const { sequelize } = require("../db_connection");

const {
  GetGuiaMantenimientoByIdDB,
  GetPlanMantenimientoByIdDB,
  GetProgramacionGuiaMantenimientoByIdDB,
  CreateProgramacionGuiaMantenimientoDB,
  UpdateProgramacionGuiaMantenimientoDB,
  GetPendientesParaVencerDB,
} = require("../controllers/guiaMantenimientoProgramacionController");

const { AddFrequency, AddPeriodoGuia } = require("../utils/guiaMantenimientoFechas");
const { SubtractAnticipacion } = require("../utils/guiaMantenimientoAlertas");

const isUUID = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const toDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const CreateNextProgramacionIfAllowed = async ({
  guia,
  plan,
  baseDate,
  usuarioIdAccion,
  t,
}) => {
  const fechaFinGuia = AddPeriodoGuia(guia.fechaInicioAlerta, guia.periodo);
  const nextDate = AddFrequency(baseDate, plan.frecuencia, plan.frecuenciaHoras);

  if (nextDate > fechaFinGuia) return null;

  const fechaAlertaCalculada =
    guia.alertaActiva &&
    guia.tipoAnticipacionAlerta &&
    guia.valorAnticipacionAlerta
      ? SubtractAnticipacion(
          nextDate,
          guia.tipoAnticipacionAlerta,
          guia.valorAnticipacionAlerta
        )
      : null;

  const next = await CreateProgramacionGuiaMantenimientoDB(
    {
      guiaMantenimientoId: guia.id,
      fechaProgramada: nextDate,
      fechaAlertaCalculada,
      alertaDisparada: false,
      estado: "PENDIENTE",
      usuarioIdAccion: usuarioIdAccion || null,
      state: true,
    },
    t
  );

  return next;
};

/* =======================
   EJECUTAR
======================= */
const EjecutarProgramacionGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const { fechaEjecucionReal, comentario, usuarioIdAccion } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const prog = await GetProgramacionGuiaMantenimientoByIdDB(id, t);

      if (prog.estado !== "PENDIENTE" && prog.estado !== "VENCIDO") {
        throw new Error("Solo puedes ejecutar una programación PENDIENTE o VENCIDO.");
      }

      const guia = await GetGuiaMantenimientoByIdDB(prog.guiaMantenimientoId, t);
      const plan = await GetPlanMantenimientoByIdDB(guia.planMantenimientoId, t);

      const real = fechaEjecucionReal ? toDate(fechaEjecucionReal) : new Date();
      if (!real) throw new Error("fechaEjecucionReal inválida.");

      const updated = await UpdateProgramacionGuiaMantenimientoDB(
        id,
        {
          estado: "EJECUTADO",
          fechaEjecucionReal: real,
          comentario: comentario ?? null,
          usuarioIdAccion: usuarioIdAccion || null,
        },
        t
      );

      const siguiente = await CreateNextProgramacionIfAllowed({
        guia,
        plan,
        baseDate: real,
        usuarioIdAccion: usuarioIdAccion || null,
        t,
      });

      return { programacion: updated, siguiente };
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/* =======================
   CANCELAR
======================= */
const CancelarProgramacionGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const { comentario, usuarioIdAccion } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const prog = await GetProgramacionGuiaMantenimientoByIdDB(id, t);

      if (prog.estado !== "PENDIENTE" && prog.estado !== "VENCIDO") {
        throw new Error("Solo puedes cancelar una programación PENDIENTE o VENCIDO.");
      }

      const guia = await GetGuiaMantenimientoByIdDB(prog.guiaMantenimientoId, t);
      const plan = await GetPlanMantenimientoByIdDB(guia.planMantenimientoId, t);

      const updated = await UpdateProgramacionGuiaMantenimientoDB(
        id,
        {
          estado: "CANCELADO",
          comentario: comentario ?? null,
          usuarioIdAccion: usuarioIdAccion || null,
        },
        t
      );

      const siguiente = await CreateNextProgramacionIfAllowed({
        guia,
        plan,
        baseDate: prog.fechaProgramada,
        usuarioIdAccion: usuarioIdAccion || null,
        t,
      });

      return { programacion: updated, siguiente };
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/* =======================
   JOB: MARCAR VENCIDAS
======================= */
const JobMarcarVencidasProgramacionesGuiaMantenimientoHandler = async (req, res) => {
  try {
    const now = new Date();
    const list = await GetPendientesParaVencerDB(now);

    let marcadas = 0;

    await sequelize.transaction(async (t) => {
      for (const p of list) {
        await p.update({ estado: "VENCIDO" }, { transaction: t });
        marcadas++;
      }
    });

    return res.status(200).json({
      message: "Job ejecutado.",
      marcadasVencidas: marcadas,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  EjecutarProgramacionGuiaMantenimientoHandler,
  CancelarProgramacionGuiaMantenimientoHandler,
  JobMarcarVencidasProgramacionesGuiaMantenimientoHandler,
};