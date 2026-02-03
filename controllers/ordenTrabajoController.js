const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  AvisoEquipo,
  Aviso,
  sequelize
} = require("../db_connection");

const { Op } = require("sequelize");

async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const { equipos, ...otData } = data;

    // 🔹 1. Obtener aviso
    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });

    if (!aviso) throw new Error("Aviso no encontrado");

    // 🔹 2. Contar OTs existentes
    const countOT = await OrdenTrabajo.count({
      where: { avisoId: aviso.id },
      transaction: t
    });

    const equiposAviso = await AvisoEquipo.findAll({
  where: {
    avisoId: aviso.id,
    equipoId: equipos.map(e => e.equipoId)
  },
  transaction: t
});

if (equiposAviso.length !== equipos.length) {
  throw new Error("Uno o más equipos no pertenecen al aviso");
}




    // 🔹 3. Generar número OT
    const correlativo = String(countOT + 1).padStart(3, "0");
    otData.numeroOT = `${aviso.numeroAviso}-OT${correlativo}`;

    // 🔹 4. Crear OT
    const ot = await OrdenTrabajo.create(otData, { transaction: t });

    // 🔹 5. Insertar equipos
    const detalles = equipos.map((e) => ({
      ordenTrabajoId: ot.id,
      equipoId: e.equipoId,
      descripcionEquipo: e.descripcionEquipo,
      personalAsignado: e.personalAsignado,
      tipoActividad: e.tipoActividad,
      prioridad: e.prioridad,
      fechaInicioProgramada: e.fechaInicioProgramada,
      fechaFinProgramada: e.fechaFinProgramada
    }));

    await OrdenTrabajoEquipo.bulkCreate(detalles, { transaction: t });

    // 🔹 6. Cambiar estado aviso
    await aviso.update(
      { estadoAviso: "con OT" },
      { transaction: t }
    );

    await t.commit();
    return ot;

  } catch (error) {
    await t.rollback();
    throw error;
  }
}



async function obtenerOrdenesTrabajo() {
  return await OrdenTrabajo.findAll({
    include: {
  association: "equipos",
  include: {
    association: "equipo"
  }
}
  });
}


async function obtenerOrdenTrabajoPorId(id) {
 return await OrdenTrabajo.findByPk(ot.id, {
  include: {
    association: "equipos",
    include: { association: "equipo" }
  },
  transaction: t
});

}


async function actualizarOrdenTrabajo(id, data) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;

  await ot.update(data);
  return ot;
}


async function eliminarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;

  await OrdenTrabajoEquipo.destroy({ where: { ordenTrabajoId: id } });
  await ot.destroy();

  return true;
}


module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajo,
  eliminarOrdenTrabajo
};
