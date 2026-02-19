const { AvisoEquipo, Equipo, sequelize } = require("../db_connection");
const { Op } = require("sequelize");

const getEquiposDisponiblesPorAviso = async (avisoId) => {
  return await AvisoEquipo.findAll({
    where: { avisoId },
    include: [
      {
        association: "equipo",
        required: true,
        include: [
          {
            association: "ordenesTrabajoEquipos",
            required: false,
            where: {
              estadoEquipo: { [Op.in]: ["PENDIENTE", "EN_PROCESO"] }
            }
          }
        ]
      },
    ],
  });
};


module.exports = {
  getEquiposDisponiblesPorAviso,
};
