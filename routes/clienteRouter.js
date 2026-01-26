const router = require("express").Router();
const h = require("../handlers/clienteHandler");
const auth = require("../middlewares/auth");

router.get("/", auth, h.listarClientes);    
router.get("/:id",auth, h.obtenerCliente);
router.post("/",auth, h.crearCliente);
router.put("/:id", auth, h.actualizarCliente);
router.delete("/:id", auth, h.eliminarCliente);

module.exports = router;
