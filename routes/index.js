const { Router } = require("express");
const router = Router();
const solicitudCompraRutas = require("./solicitudCompraRouter")
const authRutas = require("./authRouter")
const usuarioRutas = require("./usuarioRouter")

router.use("/solicitudCompra", solicitudCompraRutas);
router.use("/auth" , authRutas)
router.use("/usuario",usuarioRutas)
module.exports = router;