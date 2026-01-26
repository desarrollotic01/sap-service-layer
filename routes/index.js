const { Router } = require("express");
const router = Router();
const solicitudCompraRutas = require("./solicitudCompraRouter")
const authRutas = require("./authRouter")
const usuarioRutas = require("./usuarioRouter")
const userViewConfigRutas = require("./userViewConfig.routes")
const AvisoRouter = require("./AvisoRouter");
const tratamiento = require("./tratamientoRouter");
const trabajadorRouter = require("./trabajadorRouter");
const clienteRouter = require("./clienteRouter");
const equipoRouter = require("./equipoRouter");
const ubicacionTecnicaRouter = require("./ubicacionTecnicaRouter");
const contactoRouter = require("./contactoRouter");







router.use("/trabajador", trabajadorRouter);
router.use("/tratamiento", tratamiento);



router.use("/solicitudCompra", solicitudCompraRutas);
router.use("/auth" , authRutas)
router.use("/usuario",usuarioRutas)
router.use("/view-config", userViewConfigRutas)
router.use("/avisos", AvisoRouter);
router.use("/cliente", clienteRouter);
router.use("/equipo", equipoRouter);
router.use("/ubicacion-tecnica", ubicacionTecnicaRouter);  
router.use("/contacto", contactoRouter); 
module.exports = router;