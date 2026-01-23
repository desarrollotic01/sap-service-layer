const { Router } = require("express");
const router = Router();
const solicitudCompraRutas = require("./solicitudCompraRouter")
const authRutas = require("./authRouter")
const usuarioRutas = require("./usuarioRouter")
const userViewConfigRutas = require("./userViewConfig.routes")
const AvisoRouter = require("./AvisoRouter");




router.use("/solicitudCompra", solicitudCompraRutas);
router.use("/auth" , authRutas)
router.use("/usuario",usuarioRutas)
router.use("/view-config", userViewConfigRutas)
router.use("/avisos", AvisoRouter);
module.exports = router;