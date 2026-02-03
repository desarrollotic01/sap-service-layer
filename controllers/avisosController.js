const { Aviso, Usuario, AvisoEquipo, sequelize, Equipo } = require("../db_connection");

/* =========================
   CREAR AVISO
========================= */
async function crearAviso(data, userId) {
  const t = await sequelize.transaction();

  try {
    const { equipos, ...avisoData } = data;

    const aviso = await Aviso.create(
      {
        ...avisoData,
        estadoAviso: "creado",
        creadoPor: userId,
        solicitanteId: userId,
      },
      { transaction: t }
    );

    if (equipos && equipos.length > 0) {
      const relaciones = equipos.map((equipoId) => ({
        avisoId: aviso.id,
        equipoId,
      }));

      await AvisoEquipo.bulkCreate(relaciones, { transaction: t });
    }

    await t.commit();
    return aviso;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/* =========================
   GET TODOS
========================= */
async function obtenerAvisos() {
  return await Aviso.findAll({
    include: [
      {
        model: Usuario,
        as: "creador",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        model: Usuario,
        as: "solicitante",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        association: "equiposRelacion",
        attributes: ["id", "equipoId"], 
        include: [
          {
            model: Equipo,
            as: "equipo",
            attributes: ["id", "nombre", "codigo", "tipo"],
          },
        ],
      },
      {
        association: "tratamientos",
        attributes: ["id"]
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/* =========================
   GET POR ID
========================= */
async function obtenerAvisoPorId(id) {
  return await Aviso.findByPk(id, {
    include: [
      {
        model: Usuario,
        as: "creador",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        model: Usuario,
        as: "solicitante",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        association: "equiposRelacion",
      },
    ],
  });
}

/* =========================
   UPDATE
========================= */
async function actualizarAviso(id, data) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  const t = await sequelize.transaction();

  try {
    const { equipos, ...avisoData } = data;

    // actualizar campos aviso
    await aviso.update(avisoData, { transaction: t });

    // actualizar equipos si vienen
    if (equipos) {
      // borrar relaciones actuales
      await AvisoEquipo.destroy({
        where: { avisoId: id },
        transaction: t,
      });

      // crear nuevas
      if (equipos.length > 0) {
        const relaciones = equipos.map((equipoId) => ({
          avisoId: id,
          equipoId,
        }));

        await AvisoEquipo.bulkCreate(relaciones, { transaction: t });
      }
    }

    await t.commit();
    return aviso;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/* =========================
   DELETE
========================= */
async function eliminarAviso(id) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  const t = await sequelize.transaction();

  try {
    // borrar relaciones primero
    await AvisoEquipo.destroy({
      where: { avisoId: id },
      transaction: t,
    });

    // borrar aviso
    await aviso.destroy({ transaction: t });

    await t.commit();
    return true;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}


async function actualizarEstadoAviso(id, estado) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) throw new Error("Aviso no encontrado");

  aviso.estadoAviso = estado;
  await aviso.save();

  return aviso;
}


/* =========================
   EXPORTS
========================= */
module.exports = {
  crearAviso,
  obtenerAvisos,
  obtenerAvisoPorId,
  actualizarAviso,
  eliminarAviso,
  actualizarEstadoAviso,
};
