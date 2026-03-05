const { Router } = require("express");

const {
  CreateGuiaMantenimientoHandler,
  GetAllGuiaMantenimientoHandler,
  GetGuiaMantenimientoByIdHandler,
  UpdateGuiaMantenimientoHandler,
  DeleteGuiaMantenimientoHandler,
  DeleteAdjuntoGuiaMantenimientoHandler,
} = require("../handlers/guiaMantenimientoHandler");

const router = Router();

router.post("/", CreateGuiaMantenimientoHandler);
router.get("/", GetAllGuiaMantenimientoHandler);
router.get("/:id", GetGuiaMantenimientoByIdHandler);
router.put("/:id", UpdateGuiaMantenimientoHandler);
router.delete("/:id", DeleteGuiaMantenimientoHandler);

router.delete("/adjuntos/:adjuntoId", DeleteAdjuntoGuiaMantenimientoHandler);

module.exports = router;