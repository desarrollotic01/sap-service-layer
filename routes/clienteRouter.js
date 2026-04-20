const router = require("express").Router();
const h = require("../handlers/clienteHandler");
const roleAuth = require("../checkers/roleAuth");
router.get("/", roleAuth(["all_access","read_clientes"]), h.listarClientes);
router.get("/:id", roleAuth(["all_access","read_clientes"]), h.obtenerCliente);
router.post("/", roleAuth(["all_access","create_clientes"]), h.crearCliente);
router.put("/:id", roleAuth(["all_access","update_clientes"]), h.actualizarCliente);
router.delete("/:id", roleAuth(["all_access","delete_clientes"]), h.eliminarCliente);
module.exports = router;