const { Router } = require("express");
const router = Router();
const handler = require("../handlers/rolPermisoHandler");
const roleAuth = require("../checkers/roleAuth");

// ─── PERMISOS ────────────────────────────────────────────────────────────────
router.get("/permisos", roleAuth(["all_access", "read_permisos"]), handler.getAllPermisosHandler);
router.get("/permisos/:id", roleAuth(["all_access", "read_permisos"]), handler.getPermisoByIdHandler);
router.post("/permisos", roleAuth(["all_access", "create_permisos"]), handler.createPermisoHandler);
router.patch("/permisos/:id", roleAuth(["all_access", "update_permisos"]), handler.updatePermisoHandler);
router.delete("/permisos/:id", roleAuth(["all_access", "delete_permisos"]), handler.deletePermisoHandler);

// ─── ROLES ───────────────────────────────────────────────────────────────────
router.get("/roles", roleAuth(["all_access", "read_roles"]), handler.getAllRolesHandler);
router.get("/roles/:id", roleAuth(["all_access", "read_roles"]), handler.getRolByIdHandler);
router.post("/roles", roleAuth(["all_access", "create_roles"]), handler.createRolHandler);
router.patch("/roles/:id", roleAuth(["all_access", "update_roles"]), handler.updateRolHandler);
router.delete("/roles/:id", roleAuth(["all_access", "delete_roles"]), handler.deleteRolHandler);

module.exports = router;
