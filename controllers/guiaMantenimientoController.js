const {
  GuiaMantenimiento,
  GuiaMantenimientoAdjunto,
  GuiaMantenimientoProgramacion,
  Equipo,
  PlanMantenimiento,
} = require("../db_connection");

const CreateGuiaMantenimiento = async (payload, t) => {
  const guia = await GuiaMantenimiento.create(payload, { transaction: t });
  return guia;
};

const CreateAdjuntosGuiaMantenimiento = async (guiaMantenimientoId, adjuntos, t) => {
  if (!adjuntos || !Array.isArray(adjuntos) || adjuntos.length === 0) return [];

  const rows = adjuntos.map((a) => ({
    guiaMantenimientoId,
    nombre: a.nombre,
    url: a.url,
    mime: a.mime || null,
    size: a.size || null,
    state: true,
  }));

  const created = await GuiaMantenimientoAdjunto.bulkCreate(rows, { transaction: t });
  return created;
};

const GetAllGuiaMantenimiento = async (where = {}) => {
  const guias = await GuiaMantenimiento.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [
      { model: GuiaMantenimientoAdjunto, as: "adjuntos" },
      { model: Equipo, as: "equipo" },
      { model: PlanMantenimiento, as: "planMantenimiento" },
      {
        model: GuiaMantenimientoProgramacion,
        as: "programaciones",
        required: false,
      },
    ],
    order: [
      [{ model: GuiaMantenimientoProgramacion, as: "programaciones" }, "fechaProgramada", "ASC"],
    ],

  });

  return guias;
};

const GetGuiaMantenimientoById = async (id) => {
  const guia = await GuiaMantenimiento.findByPk(id, {
    include: [
      { model: GuiaMantenimientoAdjunto, as: "adjuntos" },
      { model: Equipo, as: "equipo" },
      { model: PlanMantenimiento, as: "planMantenimiento" },
      {
        model: GuiaMantenimientoProgramacion,
        as: "programaciones",
        required: false,
      },
    ],
    order: [
      [{ model: GuiaMantenimientoProgramacion, as: "programaciones" }, "fechaProgramada", "ASC"],
    ],
  });

  return guia;
};

const UpdateGuiaMantenimiento = async (id, payload, t) => {
  const guia = await GuiaMantenimiento.findByPk(id, { transaction: t });
  if (!guia || guia.state === false) throw new Error("Guía no encontrada.");

  await guia.update(payload, { transaction: t });
  return guia;
};

const DeleteGuiaMantenimiento = async (id) => {
  const guia = await GuiaMantenimiento.findByPk(id);
  if (!guia || guia.state === false) throw new Error("Guía no encontrada.");

  await guia.update({ state: false });
  return { message: "Guía eliminada (state=false) correctamente." };
};

const DeleteAdjuntoGuiaMantenimiento = async (adjuntoId) => {
  const adj = await GuiaMantenimientoAdjunto.findByPk(adjuntoId);
  if (!adj || adj.state === false) throw new Error("Adjunto no encontrado.");

  await adj.update({ state: false });
  return { message: "Adjunto eliminado (state=false) correctamente." };
};

module.exports = {
  CreateGuiaMantenimiento,
  CreateAdjuntosGuiaMantenimiento,
  GetAllGuiaMantenimiento,
  GetGuiaMantenimientoById,
  UpdateGuiaMantenimiento,
  DeleteGuiaMantenimiento,
  DeleteAdjuntoGuiaMantenimiento,
};