const { Router } = require("express");
const router = Router();
const {
  loginHandler,
  createUserHandler,
  changePasswordHandler,
  logoutHandler,
} = require("../handlers/usuarioHandler");

router.post("/signin", loginHandler);
router.post("/signup", createUserHandler);
router.patch("/password", changePasswordHandler);
router.get("/logout", logoutHandler);

module.exports = router;
