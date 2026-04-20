const jwt = require("jsonwebtoken");
const { getPermisosByRolId } = require("../controllers/rolPermisoController");

// Middleware de autorización por permisos
// Uso: roleAuth(["all_access", "read_usuarios"])
const roleAuth = (permisosRequeridos = []) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ errors: ["No autenticado"] });
    }

    const { id_rol } = req.user;

    if (!id_rol) {
      return res.status(403).json({ errors: ["El usuario no tiene rol asignado"] });
    }

    const permisos = await getPermisosByRolId(id_rol);

    if (!permisos) {
      return res.status(403).json({ errors: ["No se pudieron verificar los permisos"] });
    }

    const tienePermiso = permisosRequeridos.some((p) => permisos.includes(p));

    if (!tienePermiso) {
      return res.status(403).json({ errors: ["Acceso denegado: permiso insuficiente"] });
    }

    next();
  };
};

module.exports = roleAuth;
