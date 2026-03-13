const { getAllRubrosController } = require("../controllers/rubroController");

const getAllRubrosHandler = async (req, res) => {
  try {
    const rubros = await getAllRubrosController();

    return res.status(200).json(rubros);
  } catch (error) {
    console.error("Error en getAllRubrosHandler:", error);
    return res.status(500).json({
      error: "Error al obtener los rubros",
    });
  }
};

module.exports = {
  getAllRubrosHandler,
};