const authController = require("../controllers/authController");
const validator = require("./authHandler");

const loginHandler = async (req, res) => {
  const errors = validator.validarLogin(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const result = await authController.login(
    req.body.alias,
    req.body.password
  );

  if (!result) {
    return res.status(401).json({
      errors: ["Usuario o contraseña incorrectos"],
    });
  }

  res.status(200).json(result);
};

module.exports = {
  loginHandler,
};
