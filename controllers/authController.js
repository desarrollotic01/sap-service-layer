const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { Usuario, Rol } = require("../db_connection");

const login = async (alias, password) => {
  const usuario = await Usuario.findOne({
    where: { alias, state: true },
    include: [{ model: Rol, as: "rol", attributes: ["id", "nombre"] }],
  });

  if (!usuario) return null;

  const validPassword = await argon2.verify(usuario.password, password);
  if (!validPassword) return null;

  const token = jwt.sign(
    {
      id: usuario.id,
      alias: usuario.alias,
      id_rol: usuario.id_rol || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombreApellido: usuario.nombreApellido,
      alias: usuario.alias,
      rol: usuario.rol || null,
    },
  };
};

module.exports = {
  login,
};
