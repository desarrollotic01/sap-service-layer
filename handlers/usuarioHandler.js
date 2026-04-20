const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const {
  createUser,
  getUser,
  changePassword,
  signToken,
  getToken,
  changeUserData,
  getAllUsers,
  getUsersForSelector,
  getUserById,
  deleteUser,
  logoutUser,
} = require("../controllers/usuarioController");
const { userSockets, getConnectedUsers } = require("../sockets");

const usuarioRegex = /^[a-zA-Z0-9._-]{4,20}$/;
const contraseñaRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const loginHandler = async (req, res) => {
  const { usuario, contraseña } = req.body;
  const errors = [];

  if (!usuario) errors.push("El nombre de usuario es requerido");
  else if (!usuarioRegex.test(usuario))
    errors.push("El usuario debe tener entre 4 y 20 caracteres (letras, números, puntos, guiones)");

  if (!contraseña) errors.push("La contraseña es requerida");

  if (errors.length > 0)
    return res.status(400).json({ message: "Errores de validación", data: errors });

  try {
    const user = await getUser(usuario);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado", data: false });

    const contraseñaValida = await argon2.verify(user.contraseña, contraseña);
    if (!contraseñaValida)
      return res.status(400).json({ message: "Contraseña incorrecta", data: false });

    const token = jwt.sign(
      { id: user.id, usuario: usuario, id_rol: user.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    // Si el usuario ya está conectado por socket → forzar logout
    const previousSocket = userSockets.get(usuario);
    if (previousSocket) {
      previousSocket.socket.emit("forceLogout", {
        message: "Sesión cerrada porque ingresaste desde otro dispositivo",
      });
    }

    const sesion = await signToken(usuario, token);
    if (!sesion || !sesion.token)
      return res.status(400).json({ message: "Error al iniciar sesión", data: false });

    return res.status(200).json({
      message: "Sesión iniciada",
      token,
      id_rol: user.id_rol,
      data: true,
    });
  } catch (error) {
    console.error("Error en loginHandler:", error);
    return res.status(500).json({ message: "Error en loginHandler", error: error.message });
  }
};

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
const createUserHandler = async (req, res) => {
  const { usuario, contraseña, correo, id_rol } = req.body;
  const errors = [];

  if (!usuario) errors.push("El nombre de usuario es requerido");
  else if (!usuarioRegex.test(usuario))
    errors.push("El usuario debe tener entre 4 y 20 caracteres");

  if (!contraseña) errors.push("La contraseña es requerida");
  else if (!contraseñaRegex.test(contraseña))
    errors.push("La contraseña debe tener al menos 6 caracteres con letras y números");

  if (!correo) errors.push("El correo es requerido");
  else if (!correoRegex.test(correo)) errors.push("Formato de correo inválido");

  if (errors.length > 0)
    return res.status(400).json({ message: "Errores de validación", data: errors });

  try {
    const response = await createUser({ usuario, contraseña, correo, id_rol });
    if (!response)
      return res.status(400).json({ message: "Error al crear el usuario", data: false });

    return res.status(201).json({ message: "Usuario creado correctamente", data: response });
  } catch (error) {
    console.error("Error en createUserHandler:", error.message);
    return res.status(500).json({ message: "Error en createUserHandler", error: error.message });
  }
};

// ─── CAMBIAR CONTRASEÑA ───────────────────────────────────────────────────────
const changePasswordHandler = async (req, res) => {
  const { usuario, contraseña, nuevaContraseña } = req.body;
  const errors = [];

  if (!usuario) errors.push("El nombre de usuario es requerido");
  if (!contraseña) errors.push("La contraseña actual es requerida");
  if (!nuevaContraseña) errors.push("La nueva contraseña es requerida");
  else if (!contraseñaRegex.test(nuevaContraseña))
    errors.push("La nueva contraseña debe tener al menos 6 caracteres con letras y números");

  if (errors.length > 0)
    return res.status(400).json({ message: "Errores de validación", data: errors });

  try {
    const user = await getUser(usuario);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const contraseñaCorrecta = await argon2.verify(user.dataValues.contraseña, contraseña);
    if (!contraseñaCorrecta)
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });

    if (await argon2.verify(user.dataValues.contraseña, nuevaContraseña))
      return res.status(400).json({ message: "La nueva contraseña no puede ser igual a la anterior" });

    const response = await changePassword(usuario, nuevaContraseña);
    if (!response) return res.status(500).json({ message: "Error al cambiar la contraseña" });

    return res.status(200).json({ message: "Contraseña cambiada correctamente" });
  } catch (error) {
    console.error("Error en changePasswordHandler:", error.message);
    return res.status(500).json({ message: "Error en changePasswordHandler", error: error.message });
  }
};

// ─── OBTENER TODOS ────────────────────────────────────────────────────────────
const getAllUsersHandler = async (req, res) => {
  const { page = 1, pageSize = 20, search } = req.query;
  const filters = { search };
  const errors = [];

  if (isNaN(page)) errors.push("El page debe ser un número");
  if (page < 0) errors.push("El page debe ser mayor a 0");
  if (isNaN(pageSize)) errors.push("El pageSize debe ser un número");
  if (pageSize <= 0) errors.push("El pageSize debe ser mayor a 0");
  if (errors.length > 0) return res.status(400).json({ errors });

  try {
    const users = await getAllUsers(page, pageSize, filters);
    const totalPages = Math.ceil(users.totalCount / pageSize);

    return res.status(200).json({
      message: "Usuarios obtenidos correctamente",
      data: {
        data: users.data,
        currentPage: page,
        totalPages,
        totalCount: users.totalCount,
      },
    });
  } catch (error) {
    console.error("Error en getAllUsersHandler:", error.message);
    return res.status(500).json({ message: "Error en getAllUsersHandler", error: error.message });
  }
};

// ─── OBTENER MI USUARIO (por token) ──────────────────────────────────────────
const getUserByIdHandler = async (req, res) => {
  const token = req.token; // puesto por validateToken

  try {
    const user = await getUserById(token);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado", data: false });

    return res.status(200).json({ message: "Usuario encontrado", data: user });
  } catch (error) {
    console.error("Error en getUserByIdHandler:", error.message);
    return res.status(500).json({ message: "Error en getUserByIdHandler", data: error.message });
  }
};

// ─── EDITAR USUARIO ───────────────────────────────────────────────────────────
const changeUserDataHandler = async (req, res) => {
  const { id } = req.params;
  const { correo, id_rol } = req.body;
  const errors = [];

  if (!id) errors.push("El ID del usuario es requerido");
  if (correo && !correoRegex.test(correo)) errors.push("Formato de correo inválido");
  if (errors.length > 0)
    return res.status(400).json({ message: "Errores de validación", data: errors });

  try {
    const response = await changeUserData(id, correo, id_rol);
    if (response === null) return res.status(404).json({ message: "Usuario no encontrado", data: false });
    if (!response) return res.status(400).json({ message: "Error al actualizar los datos", data: false });

    return res.status(200).json({ message: "Datos actualizados correctamente", data: response });
  } catch (error) {
    console.error("Error en changeUserDataHandler:", error.message);
    return res.status(500).json({ message: "Error en changeUserDataHandler", error: error.message });
  }
};

// ─── ELIMINAR USUARIO ─────────────────────────────────────────────────────────
const deleteUserHandler = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await deleteUser(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado", data: false });

    return res.status(200).json({ message: "Usuario eliminado correctamente", data: true });
  } catch (error) {
    console.error("Error en deleteUserHandler:", error.message);
    return res.status(500).json({ message: "Error en deleteUserHandler", data: error.message });
  }
};

// ─── SELECTOR (sin roleAuth) ──────────────────────────────────────────────────
const getUsersForSelectorHandler = async (req, res) => {
  try {
    const users = await getUsersForSelector();
    return res.status(200).json({ message: "OK", data: users });
  } catch (error) {
    console.error("Error en getUsersForSelectorHandler:", error.message);
    return res.status(500).json({ message: "Error interno", error: error.message });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
const logoutHandler = async (req, res) => {
  const usuario = req.user?.usuario; // viene del decoded JWT en validateToken

  if (!usuario) {
    return res.status(400).json({ message: "No se pudo identificar el usuario" });
  }

  try {
    const result = await logoutUser(usuario);
    if (!result) return res.status(404).json({ message: "Usuario no encontrado" });

    // Notificar por socket si está conectado
    const socketData = userSockets.get(usuario);
    if (socketData) {
      socketData.socket.emit("logout", { message: "Sesión cerrada", usuario });
      userSockets.delete(usuario);
    }

    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logoutHandler:", error.message);
    return res.status(500).json({ message: "Error al cerrar sesión", error: error.message });
  }
};

// ─── USUARIOS CONECTADOS ──────────────────────────────────────────────────────
const getConnectedUsersHandler = (req, res) => {
  try {
    const connected = getConnectedUsers();
    return res.status(200).json({
      message: "Usuarios conectados",
      total: connected.length,
      data: connected,
    });
  } catch (error) {
    console.error("Error en getConnectedUsersHandler:", error.message);
    return res.status(500).json({ message: "Error al obtener usuarios conectados", error: error.message });
  }
};

module.exports = {
  loginHandler,
  createUserHandler,
  changePasswordHandler,
  getAllUsersHandler,
  getUsersForSelectorHandler,
  getUserByIdHandler,
  changeUserDataHandler,
  deleteUserHandler,
  logoutHandler,
  getConnectedUsersHandler,
};
