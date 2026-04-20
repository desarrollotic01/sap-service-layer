const jwt = require("jsonwebtoken");
const { getToken, getUser } = require("../controllers/usuarioController");

const loginMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No se detectó sesión de usuario" });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Formato de token inválido. Use: Bearer <token>" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el token coincide con el guardado en BD (sesión única)
    const dbToken = await getToken(decoded.usuario);
    if (!dbToken || dbToken.dataValues.token !== token) {
      return res.status(401).json({ message: "Sesión inválida o cerrada en otro dispositivo" });
    }

    // Si el token es viejo y no tiene id, buscarlo en BD
    if (!decoded.id) {
      const userDB = await getUser(decoded.usuario);
      if (userDB) decoded.id = userDB.id;
    }

    req.user  = decoded; // { id, usuario, id_rol, iat, exp }
    req.token = token;   // JWT string (para getUserById y logout)
    next();
  } catch (error) {
    console.error("Error en validateToken:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado", data: error.message });
  }
};

module.exports = loginMiddleware;
