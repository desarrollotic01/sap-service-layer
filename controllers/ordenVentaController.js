const { OrdenVenta } = require("../db_connection");

const getAllOrdenesVentaController = async () => {
  const ordenes = await OrdenVenta.findAll({
    where: { activoSAP: true },
    order: [["docNum", "DESC"]],
  });

  return ordenes;
};

module.exports = {
  getAllOrdenesVentaController,
};
