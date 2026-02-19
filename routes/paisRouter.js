const { Router } = require("express");
const {
  crearPais,
  listarPaises,
  obtenerPais,
  actualizarPais,
  eliminarPais,
} = require("../handlers/paisHandler");

const router = Router();
const auth = require("../middlewares/auth")

router.post("/",auth ,crearPais);
router.get("/",auth, listarPaises);
router.get("/:id",auth, obtenerPais);
router.put("/:id",auth, actualizarPais);
router.delete("/:id",auth, eliminarPais);

module.exports = router;
