const controller = require("../controllers/userViewConfigController");

const getConfigHandler = async (req, res) => {
  const { modulo, vista } = req.params;

  const data = await controller.getConfig(
    req.user.id,
    modulo,
    vista
  );

  res.status(200).json(data);
};

const saveConfigHandler = async (req, res) => {
  const { modulo, vista } = req.params;

  const data = await controller.saveConfig(
    req.user.id,
    modulo,
    vista,
    req.body
  );

  res.status(200).json(data);
};

module.exports = {
  getConfigHandler,
  saveConfigHandler,
};
