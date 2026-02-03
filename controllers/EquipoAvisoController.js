const { AvisoEquipo, Equipo, sequelize } = require("../db_connection");
const { Op } = require("sequelize");

const getEquiposDisponiblesPorAviso = async (avisoId) => {
  return await AvisoEquipo.findAll({
    where: {
      avisoId,
      equipoId: {
        [Op.notIn]: sequelize.literal(`
          (
            SELECT "equipoId"
            FROM "orden_trabajo_equipos"
            WHERE "estadoEquipo" IN ('PENDIENTE', 'EN_PROCESO')
          )
        `),
      },
    },
    include: [
      {
        association: "equipo",
        required: true,
      },
    ],
  });
};

module.exports = {
  getEquiposDisponiblesPorAviso,
};
