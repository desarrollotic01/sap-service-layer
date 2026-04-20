const { getPermisosByRolId } = require("../controllers/rolPermisoController");

// Uso: roleAuth(["all_access", "read_usuarios"])
const roleAuth = (permisosRequeridos = []) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    // req.user ya es el decoded JWT ({ id, usuario, id_rol }) puesto por validateToken
    const { id_rol } = req.user;

    if (!id_rol) {
      return res.status(403).json({ message: "El usuario no tiene rol asignado" });
    }

    const permisos = await getPermisosByRolId(id_rol);

    if (!permisos) {
      return res.status(403).json({ message: "No se pudieron verificar los permisos" });
    }

    const tienePermiso = permisosRequeridos.some((p) => permisos.includes(p));

    if (!tienePermiso) {
      return res.status(403).json({ message: "Acceso denegado: permiso insuficiente" });
    }

    next();
  };
};

module.exports = roleAuth;
