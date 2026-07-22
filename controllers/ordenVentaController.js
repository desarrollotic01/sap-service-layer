const { OrdenVenta } = require("../db_connection");

const getAllOrdenesVentaController = async () => {
  const ordenes = await OrdenVenta.findAll({
    where: { activoSAP: true },
    order: [["codigoProyecto", "ASC"]],
  });

  return ordenes;
};

module.exports = {
  getAllOrdenesVentaController,
};
