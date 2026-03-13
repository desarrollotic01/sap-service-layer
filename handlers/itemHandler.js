const { getAllItemsController } = require("../controllers/itemController");

const getAllItemsHandler = async (req, res) => {
  try {
    const items = await getAllItemsController();

    return res.status(200).json(items);
  } catch (error) {
    console.error("Error en getAllItemsHandler:", error);

    return res.status(500).json({
      error: "Error al obtener los items",
    });
  }
};

module.exports = {
  getAllItemsHandler,
};