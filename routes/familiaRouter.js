const { Router } = require("express");
const {
  crearFamilia,
  listarFamilias,
  obtenerFamilia,
  actualizarFamilia,
  eliminarFamilia,
} = require("../handlers/familiaHandler");

const router = Router();
const auth = require("../middlewares/auth")


router.post("/", auth,crearFamilia);
router.get("/",auth, listarFamilias);
router.get("/:id",auth ,obtenerFamilia);
router.put("/:id",auth, actualizarFamilia);
router.delete("/:id",auth, eliminarFamilia);

module.exports = router;
