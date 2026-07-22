const { getAllOrdenesVentaController } = require("../controllers/ordenVentaController");

const getAllOrdenesVentaHandler = async (req, res) => {
  try {
    const ordenes = await getAllOrdenesVentaController();

    return res.status(200).json(ordenes);
  } catch (error) {
    console.error("Error en getAllOrdenesVentaHandler:", error);

    return res.status(500).json({
      error: "Error al obtener las órdenes de venta",
    });
  }
};

module.exports = {
  getAllOrdenesVentaHandler,
};
