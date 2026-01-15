const argon2 = require("argon2");
const { Usuario } = require("../db_connection");

// Obtener todos los usuarios activos
const getAllUsuarios = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  try {
    const response = await Usuario.findAndCountAll({
      where: { state: true },
      limit,
      offset,
      order: [["createdAt", "ASC"]],
    });

    return {
      totalCount: response.count,
      data: response.rows,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error getAllUsuarios:", error);
    return false;
  }
};

// Obtener un usuario por UUID
const getUsuario = async (id) => {
  try {
    return await Usuario.findOne({
      where: { id, state: true },
    });
  } catch (error) {
    console.error("Error getUsuario:", error);
    return false;
  }
};

// Crear usuario
const createUsuario = async ({ nombreApellido, alias, password }) => {
  try {
    const hashedPassword = await argon2.hash(password);

    return await Usuario.create({
      nombreApellido,
      alias,
      password: hashedPassword,
      state: true,
    });
  } catch (error) {
    console.error("Error createUsuario:", error);
    return false;
  }
};

// Verificar login
const verifyUsuario = async (alias, password) => {
  try {
    const usuario = await Usuario.findOne({
      where: { alias, state: true },
    });

    if (!usuario) return null;

    const valid = await argon2.verify(usuario.password, password);
    return valid ? usuario : null;
  } catch (error) {
    console.error("Error verifyUsuario:", error);
    return false;
  }
};

// Actualizar usuario
const updateUsuario = async (id, datos) => {
  try {
    const usuario = await getUsuario(id);
    if (!usuario) return null;

    if (datos.password) {
      datos.password = await argon2.hash(datos.password);
    }

    await usuario.update(datos);
    return usuario;
  } catch (error) {
    console.error("Error updateUsuario:", error);
    return false;
  }
};

// Borrado lógico
const deleteUsuario = async (id) => {
  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;

    usuario.state = false;
    await usuario.save();
    return usuario;
  } catch (error) {
    console.error("Error deleteUsuario:", error);
    return false;
  }
};

module.exports = {
  getAllUsuarios,
  getUsuario,
  createUsuario,
  verifyUsuario,
  updateUsuario,
  deleteUsuario,
};
