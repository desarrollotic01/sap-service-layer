const { Rol, Permiso } = require("../db_connection");
const { Op } = require("sequelize");

// ─── PERMISOS ───────────────────────────────────────────────────────────────

const getAllPermisos = async (page = 1, limit = 100, search = "") => {
  const offset = (page - 1) * limit;

  try {
    const where = {
      state: true,
      ...(search && { nombre: { [Op.iLike]: `%${search}%` } }),
    };

    const response = await Permiso.findAndCountAll({
      where,
      limit,
      offset,
      order: [["nombre", "ASC"]],
    });

    return { totalCount: response.count, data: response.rows, currentPage: page };
  } catch (error) {
    console.error("Error getAllPermisos:", error);
    return false;
  }
};

const getPermisoById = async (id) => {
  try {
    return await Permiso.findByPk(id);
  } catch (error) {
    console.error("Error getPermisoById:", error);
    return false;
  }
};

const createPermiso = async (nombre, descripcion) => {
  try {
    return await Permiso.create({ nombre, descripcion });
  } catch (error) {
    console.error("Error createPermiso:", error);
    return false;
  }
};

const updatePermiso = async (id, nombre, descripcion) => {
  try {
    const permiso = await Permiso.findByPk(id);
    if (!permiso) return null;

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;

    await permiso.update(updates);
    return permiso;
  } catch (error) {
    console.error("Error updatePermiso:", error);
    return false;
  }
};

const deletePermiso = async (id) => {
  try {
    const permiso = await Permiso.findByPk(id);
    if (!permiso) return null;

    await permiso.update({ state: false });
    return true;
  } catch (error) {
    console.error("Error deletePermiso:", error);
    return false;
  }
};

// ─── ROLES ──────────────────────────────────────────────────────────────────

const getAllRoles = async (page = 1, limit = 20, search = "") => {
  const offset = (page - 1) * limit;

  try {
    const where = {
      state: true,
      ...(search && { nombre: { [Op.iLike]: `%${search}%` } }),
    };

    const response = await Rol.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: Permiso, as: "permisos", attributes: ["id", "nombre", "descripcion"] }],
      order: [["nombre", "ASC"]],
    });

    return { totalCount: response.count, data: response.rows, currentPage: page };
  } catch (error) {
    console.error("Error getAllRoles:", error);
    return false;
  }
};

const getRolById = async (id) => {
  try {
    return await Rol.findByPk(id, {
      include: [{ model: Permiso, as: "permisos", attributes: ["id", "nombre", "descripcion"] }],
    });
  } catch (error) {
    console.error("Error getRolById:", error);
    return false;
  }
};

const createRol = async (nombre, descripcion, permisosIds = []) => {
  try {
    const rol = await Rol.create({ nombre, descripcion });

    if (permisosIds.length > 0) {
      const permisos = await Permiso.findAll({ where: { id: permisosIds } });
      await rol.addPermisos(permisos);
    }

    return await getRolById(rol.id);
  } catch (error) {
    console.error("Error createRol:", error);
    return false;
  }
};

const updateRol = async (id, nombre, descripcion, permisosIds) => {
  try {
    const rol = await Rol.findByPk(id);
    if (!rol) return null;

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;

    await rol.update(updates);

    // Reemplaza los permisos si se envía el array (aunque sea vacío)
    if (Array.isArray(permisosIds)) {
      const permisos = permisosIds.length > 0
        ? await Permiso.findAll({ where: { id: permisosIds } })
        : [];
      await rol.setPermisos(permisos);
    }

    return await getRolById(id);
  } catch (error) {
    console.error("Error updateRol:", error);
    return false;
  }
};

const deleteRol = async (id) => {
  try {
    const rol = await Rol.findByPk(id);
    if (!rol) return null;

    await rol.update({ state: false });
    return true;
  } catch (error) {
    console.error("Error deleteRol:", error);
    return false;
  }
};

// Obtener permisos de un rol por su id (usado por el middleware de autorización)
const getPermisosByRolId = async (id_rol) => {
  try {
    const rol = await Rol.findByPk(id_rol, {
      include: [{ model: Permiso, as: "permisos", attributes: ["nombre"] }],
    });

    if (!rol) return null;
    return rol.permisos.map((p) => p.nombre);
  } catch (error) {
    console.error("Error getPermisosByRolId:", error);
    return false;
  }
};

module.exports = {
  getAllPermisos,
  getPermisoById,
  createPermiso,
  updatePermiso,
  deletePermiso,
  getAllRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
  getPermisosByRolId,
};
