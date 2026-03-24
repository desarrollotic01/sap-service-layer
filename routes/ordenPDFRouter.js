const express = require("express");
const router = express.Router();
const { generarOT } = require("../controllers/ordenPDFController");

router.get("/:id/pdf", generarOT);

module.exports = router;