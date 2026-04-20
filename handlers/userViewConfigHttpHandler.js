const controller = require("../controllers/userViewConfigController");

const getConfigHandler = async (req, res) => {
  try {
    const { modulo, vista } = req.params;
    const data = await controller.obtenerConfig(req.user.id, vista || modulo);
    res.status(200).json(data);
  } catch (err) {
    console.error("getConfigHandler error:", err.message);
    res.status(500).json({ errors: ["Error al obtener configuración"] });
  }
};

const saveConfigHandler = async (req, res) => {
  try {
    const { modulo, vista } = req.params;
    const data = await controller.guardarConfig(req.user.id, vista || modulo, req.body);
    res.status(200).json(data);
  } catch (err) {
    console.error("saveConfigHandler error:", err.message);
    res.status(500).json({ errors: ["Error al guardar configuración"] });
  }
};

module.exports = {
  getConfigHandler,
  saveConfigHandler,
};
