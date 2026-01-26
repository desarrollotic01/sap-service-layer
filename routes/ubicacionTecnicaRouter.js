const router = require("express").Router();
const h = require("../handlers/ubicacionTecnicaHandler");
const auth = require("../middlewares/auth");


router.get("/", auth, h.listarUbicaciones);
router.get("/:id", auth, h.obtenerUbicacion);
router.post("/", auth, h.crearUbicacion);
router.put("/:id", auth, h.actualizarUbicacion);
router.delete("/:id", auth, h.eliminarUbicacion);
module.exports = router;
