const router = require("express").Router();
const h = require("../handlers/equipoHandler");
const auth = require("../middlewares/auth");

router.get("/", auth,h.listarEquipos);
router.get("/:id",auth, h.obtenerEquipo);
router.post("/", auth, h.crearEquipo);
router.put("/:id", auth, h.actualizarEquipo);
router.delete("/:id", auth, h.eliminarEquipo);

module.exports = router;
