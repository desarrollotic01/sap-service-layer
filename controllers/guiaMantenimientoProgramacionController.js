const { Op } = require("sequelize");
const {
  GuiaMantenimiento,
  GuiaMantenimientoProgramacion,
  PlanMantenimiento,
} = require("../db_connection");

const GetGuiaMantenimientoByIdDB = async (guiaMantenimientoId, t) => {
  const guia = await GuiaMantenimiento.findByPk(guiaMantenimientoId, { transaction: t });
  if (!guia || guia.state === false) throw new Error("Guía no encontrada.");
  return guia;
};

const GetPlanMantenimientoByIdDB = async (planMantenimientoId, t) => {
  const plan = await PlanMantenimiento.findByPk(planMantenimientoId, { transaction: t });
  if (!plan) throw new Error("PlanMantenimiento no existe.");
  return plan;
};

const GetProgramacionGuiaMantenimientoByIdDB = async (id, t) => {
  const prog = await GuiaMantenimientoProgramacion.findByPk(id, { transaction: t });
  if (!prog || prog.state === false) throw new Error("Programación no encontrada.");
  return prog;
};

const CreateProgramacionGuiaMantenimientoDB = async (payload, t) => {
  const prog = await GuiaMantenimientoProgramacion.create(payload, { transaction: t });
  return prog;
};

const UpdateProgramacionGuiaMantenimientoDB = async (id, payload, t) => {
  const prog = await GuiaMantenimientoProgramacion.findByPk(id, { transaction: t });
  if (!prog || prog.state === false) throw new Error("Programación no encontrada.");

  await prog.update(payload, { transaction: t });
  return prog;
};

// para el job
const GetPendientesParaVencerDB = async (now) => {
  const list = await GuiaMantenimientoProgramacion.findAll({
    where: {
      state: true,
      estado: "PENDIENTE",
      fechaProgramada: { [Op.lte]: now },
    },
  });
  return list;
};

module.exports = {
  GetGuiaMantenimientoByIdDB,
  GetPlanMantenimientoByIdDB,
  GetProgramacionGuiaMantenimientoByIdDB,
  CreateProgramacionGuiaMantenimientoDB,
  UpdateProgramacionGuiaMantenimientoDB,
  GetPendientesParaVencerDB,
};