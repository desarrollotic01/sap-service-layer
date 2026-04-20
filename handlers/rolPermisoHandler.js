const {
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
} = require("../controllers/rolPermisoController");

// ─── PERMISOS ────────────────────────────────────────────────────────────────

const getAllPermisosHandler = async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;

  const result = await getAllPermisos(page, limit, search || "");
  if (!result) return res.status(500).json({ errors: ["Error al obtener permisos"] });

  res.json(result);
};

const getPermisoByIdHandler = async (req, res) => {
  const { id } = req.params;
  const permiso = await getPermisoById(id);

  if (permiso === false) return res.status(500).json({ errors: ["Error al obtener permiso"] });
  if (!permiso) return res.status(404).json({ errors: ["Permiso no encontrado"] });

  res.json(permiso);
};

const createPermisoHandler = async (req, res) => {
  const { nombre, descripcion } = req.body;
  const errors = [];

  if (!nombre || nombre.trim() === "") errors.push("El nombre del permiso es requerido");
  if (errors.length > 0) return res.status(400).json({ errors });

  const permiso = await createPermiso(nombre.trim(), descripcion || "");
  if (!permiso) return res.status(500).json({ errors: ["No se pudo crear el permiso"] });

  res.status(201).json(permiso);
};

const updatePermisoHandler = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  const permiso = await updatePermiso(id, nombre, descripcion);
  if (permiso === null) return res.status(404).json({ errors: ["Permiso no encontrado"] });
  if (!permiso) return res.status(500).json({ errors: ["Error al actualizar permiso"] });

  res.json(permiso);
};

const deletePermisoHandler = async (req, res) => {
  const { id } = req.params;

  const result = await deletePermiso(id);
  if (result === null) return res.status(404).json({ errors: ["Permiso no encontrado"] });
  if (!result) return res.status(500).json({ errors: ["Error al eliminar permiso"] });

  res.json({ message: "Permiso desactivado correctamente" });
};

// ─── ROLES ───────────────────────────────────────────────────────────────────

const getAllRolesHandler = async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 20;

  const result = await getAllRoles(page, limit, search || "");
  if (!result) return res.status(500).json({ errors: ["Error al obtener roles"] });

  res.json(result);
};

const getRolByIdHandler = async (req, res) => {
  const { id } = req.params;
  const rol = await getRolById(id);

  if (rol === false) return res.status(500).json({ errors: ["Error al obtener rol"] });
  if (!rol) return res.status(404).json({ errors: ["Rol no encontrado"] });

  res.json(rol);
};

const createRolHandler = async (req, res) => {
  const { nombre, descripcion, permisos } = req.body;
  const errors = [];

  if (!nombre || nombre.trim() === "") errors.push("El nombre del rol es requerido");
  if (!Array.isArray(permisos)) errors.push("permisos debe ser un array de IDs");
  if (errors.length > 0) return res.status(400).json({ errors });

  const rol = await createRol(nombre.trim(), descripcion || "", permisos);
  if (!rol) return res.status(500).json({ errors: ["No se pudo crear el rol"] });

  res.status(201).json(rol);
};

const updateRolHandler = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, permisos } = req.body;

  const rol = await updateRol(id, nombre, descripcion, permisos);
  if (rol === null) return res.status(404).json({ errors: ["Rol no encontrado"] });
  if (!rol) return res.status(500).json({ errors: ["Error al actualizar rol"] });

  res.json(rol);
};

const deleteRolHandler = async (req, res) => {
  const { id } = req.params;

  const result = await deleteRol(id);
  if (result === null) return res.status(404).json({ errors: ["Rol no encontrado"] });
  if (!result) return res.status(500).json({ errors: ["Error al eliminar rol"] });

  res.json({ message: "Rol desactivado correctamente" });
};

module.exports = {
  getAllPermisosHandler,
  getPermisoByIdHandler,
  createPermisoHandler,
  updatePermisoHandler,
  deletePermisoHandler,
  getAllRolesHandler,
  getRolByIdHandler,
  createRolHandler,
  updateRolHandler,
  deleteRolHandler,
};
