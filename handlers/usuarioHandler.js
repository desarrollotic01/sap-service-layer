const {
  getAllUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} = require("../controllers/usuarioController");

// GET ALL
const getAllUsuariosHandler = async (req, res) => {
  let { page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 20;

  if (page < 1 || limit < 1) {
    return res.status(400).json({
      errors: ["La paginación debe ser positiva"],
    });
  }

  const usuarios = await getAllUsuarios(page, limit);
  if (!usuarios) {
    return res.status(404).json({
      errors: ["No se encontraron usuarios activos"],
    });
  }

  res.status(200).json(usuarios);
};

// GET ONE
const getUsuarioHandler = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      errors: ["ID inválido"],
    });
  }

  const usuario = await getUsuario(id);
  if (!usuario) {
    return res.status(404).json({
      errors: ["Usuario no encontrado"],
    });
  }

  res.json(usuario);
};

// CREATE
const createUsuarioHandler = async (req, res) => {
  const errors = [];

  const { nombreApellido, alias, password } = req.body;

  if (!nombreApellido || nombreApellido.length < 3)
    errors.push("Nombre y apellido inválido");

  if (!alias) errors.push("Alias requerido");

  if (!password || password.length < 6)
    errors.push("La contraseña debe tener al menos 6 caracteres");

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const usuario = await createUsuario(req.body);
  if (!usuario) {
    return res.status(500).json({
      errors: ["No se pudo crear el usuario"],
    });
  }

  res.status(201).json(usuario);
};

// UPDATE
const updateUsuarioHandler = async (req, res) => {
  const usuario = await updateUsuario(req.params.id, req.body);
  if (!usuario) {
    return res.status(404).json({
      errors: ["Usuario no encontrado"],
    });
  }

  res.json(usuario);
};

// DELETE LÓGICO
const deleteUsuarioHandler = async (req, res) => {
  const usuario = await deleteUsuario(req.params.id);
  if (!usuario) {
    return res.status(404).json({
      errors: ["Usuario no encontrado"],
    });
  }

  res.json({ message: "Usuario desactivado correctamente" });
};

module.exports = {
  getAllUsuariosHandler,
  getUsuarioHandler,
  createUsuarioHandler,
  updateUsuarioHandler,
  deleteUsuarioHandler,
};
