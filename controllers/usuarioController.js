const { Op } = require("sequelize");
const { Usuario, Rol, Permiso, UserViewConfig } = require("../db_connection");
const { DEFAULT_VIEW_CONFIGS } = require("../utils/defautlViewConfig");

const createUser = async ({ usuario, contraseña, correo, id_rol }) => {
  const transaction = await Usuario.sequelize.transaction();
  try {
    const nuevoUsuario = await Usuario.create(
      { usuario, contraseña, correo, token: null, id_rol: id_rol || null },
      { transaction }
    );

    // Crear configuraciones de vista por defecto
    const configs = Object.entries(DEFAULT_VIEW_CONFIGS).map(([view, config]) => ({
      userId: nuevoUsuario.id,
      view,
      cardFields: config.cardFields,
      columnOrder: config.columnOrder,
      filters: config.filters,
    }));
    await UserViewConfig.bulkCreate(configs, { transaction });

    await transaction.commit();
    return nuevoUsuario;
  } catch (error) {
    await transaction.rollback();
    console.error("Error en createUser:", error);
    return false;
  }
};

const changePassword = async (usuario, contraseña) => {
  try {
    const user = await getUser(usuario);
    if (user) return await user.update({ contraseña });
    return null;
  } catch (error) {
    console.error("Error en changePassword:", error.message);
    return false;
  }
};

const getUser = async (username) => {
  if (!username) {
    console.error("Error en getUser: Falta el username");
    return false;
  }
  try {
    const response = await Usuario.findOne({ where: { usuario: username } });
    return response || null;
  } catch (error) {
    console.error("Error en getUser:", error.message);
    return false;
  }
};

const signToken = async (usuario, jwt) => {
  try {
    const user = await getUser(usuario);
    if (user) return await user.update({ token: jwt });
    return null;
  } catch (error) {
    console.error("Error en signToken:", error.message);
    return false;
  }
};

const getToken = async (usuario) => {
  try {
    const token = await Usuario.findOne({
      attributes: ["token"],
      where: { usuario },
    });
    return token || null;
  } catch (error) {
    console.error("Error en getToken:", error.message);
    return false;
  }
};

const changeUserData = async (id, correo, id_rol) => {
  try {
    const user = await Usuario.findByPk(id);
    if (!user) return null;

    return await user.update({
      correo: correo !== undefined ? correo : user.correo,
      id_rol: id_rol !== undefined ? id_rol : user.id_rol,
    });
  } catch (error) {
    console.error("Error en changeUserData:", error.message);
    return false;
  }
};

const getAllUsers = async (page = 1, limit = 20, filters = {}) => {
  const { search } = filters;
  const offset = page == 0 ? null : (page - 1) * limit;
  const effectiveLimit = page == 0 ? null : limit;

  try {
    const whereCondition = {
      state: true,
      ...(search && {
        [Op.or]: [
          { usuario: { [Op.iLike]: `%${search}%` } },
          { correo: { [Op.iLike]: `%${search}%` } },
        ],
      }),
    };

    const response = await Usuario.findAndCountAll({
      attributes: ["id", "usuario", "correo", "state", "id_rol"],
      where: whereCondition,
      include: [{ model: Rol, as: "rol", attributes: ["id", "nombre"] }],
      limit: effectiveLimit,
      offset,
      order: [["createdAt", "ASC"]],
    });

    const totalPages = Math.ceil(response.count / limit);
    return {
      data: response.rows,
      currentPage: page,
      totalPages,
      totalCount: response.count,
    };
  } catch (error) {
    console.error("Error en getAllUsers:", error.message);
    return false;
  }
};

const getUsersForSelector = async () => {
  try {
    const users = await Usuario.findAll({
      where: { state: true },
      attributes: ["id", "nombreApellido", "usuario"],
      order: [["nombreApellido", "ASC"]],
    });
    return users;
  } catch (error) {
    console.error("Error en getUsersForSelector:", error.message);
    return [];
  }
};

const getUserByToken = async (token) => {
  try {
    const user = await Usuario.findOne({
      where: { token },
      attributes: ["id"],
    });
    return user ? user.id : null;
  } catch (error) {
    console.error("Error en getUserByToken:", error.message);
    return false;
  }
};

const getUserById = async (token) => {
  try {
    const user = await Usuario.findOne({
      where: { token },
      attributes: ["id", "usuario", "correo", "state", "id_rol"],
      include: [
        {
          model: Rol,
          as: "rol",
          attributes: ["id", "nombre"],
          include: [{ model: Permiso, as: "permisos", attributes: ["nombre"], through: { attributes: [] } }],
        },
      ],
    });
    return user || null;
  } catch (error) {
    console.error("Error en getUserById:", error.message);
    return false;
  }
};

const deleteUser = async (id) => {
  try {
    const user = await Usuario.findByPk(id);
    if (!user) return null;
    return await user.update({ state: false });
  } catch (error) {
    console.error("Error en deleteUser:", error.message);
    return false;
  }
};

const logoutUser = async (usuario) => {
  try {
    const user = await getUser(usuario);
    if (user) {
      await user.update({ token: null });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error en logoutUser:", error.message);
    return false;
  }
};

module.exports = {
  createUser,
  changePassword,
  getUser,
  getToken,
  signToken,
  changeUserData,
  getAllUsers,
  getUsersForSelector,
  getUserByToken,
  getUserById,
  deleteUser,
  logoutUser,
};
