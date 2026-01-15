const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { Usuario } = require("../db_connection");

const login = async (alias, password) => {
  try {
    const usuario = await Usuario.findOne({
      where: {
        alias,
        state: true,
      },
    });

    if (!usuario) return null;

    const validPassword = await argon2.verify(
      usuario.password,
      password
    );

    if (!validPassword) return null;

    const token = jwt.sign(
      {
        id: usuario.id,
        alias: usuario.alias,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nombreApellido: usuario.nombreApellido,
        alias: usuario.alias,
      },
    };
  } catch (error) {
    console.error("Error en login controller:", error);
    return false;
  }
};

module.exports = {
  login,
};
