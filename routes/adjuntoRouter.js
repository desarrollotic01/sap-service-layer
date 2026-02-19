const { Router } = require("express");
const router = Router();
const upload = require("../middlewares/multerConfig");
const { uploadAdjuntosController } = require("../controllers/adjuntoController");

router.post("/upload", upload.array("files"), uploadAdjuntosController);

module.exports = router;
