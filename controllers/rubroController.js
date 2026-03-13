const { Rubro } = require("../db_connection");

const getAllRubrosController = async () => {
  const rubros = await Rubro.findAll({
    where: { activo: true },
    order: [["nombre", "ASC"]],
  });

  return rubros;
};

module.exports = {
  getAllRubrosController,
};