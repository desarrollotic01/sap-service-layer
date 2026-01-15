const express = require("express");
const router = express.Router();
const handler = require("../handlers/usuarioHandler");

router.post("/", handler.createUsuarioHandler);

module.exports = router;
