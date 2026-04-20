const { Router } = require("express");
const router = Router();
const {
  getAllUsersHandler,
  getUsersForSelectorHandler,
  getUserByIdHandler,
  createUserHandler,
  changeUserDataHandler,
  deleteUserHandler,
  getConnectedUsersHandler,
} = require("../handlers/usuarioHandler");
const roleAuth = require("../checkers/roleAuth");

router.get("/selector", getUsersForSelectorHandler);
router.get("/", roleAuth(["all_access", "read_usuarios"]), getAllUsersHandler);
router.get("/connected", roleAuth(["all_access", "read_usuarios"]), getConnectedUsersHandler);
router.get("/me", getUserByIdHandler);
router.post("/", roleAuth(["all_access", "create_usuarios"]), createUserHandler);
router.patch("/:id", roleAuth(["all_access", "update_usuarios"]), changeUserDataHandler);
router.delete("/:id", roleAuth(["all_access", "delete_usuarios"]), deleteUserHandler);

module.exports = router;
