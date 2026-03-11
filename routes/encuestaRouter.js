const express = require("express");
const router = express.Router();

const {
  createEncuestaHandler,
  getEncuestaBySlugHandler,
  getAllEncuestasHandler,
  updateEncuestaHandler,
  responderEncuestaHandler,
} = require("../handlers/encuestaHandler");

router.post("/", createEncuestaHandler);
router.get("/", getAllEncuestasHandler);
router.get("/:slug", getEncuestaBySlugHandler);
router.put("/:id", updateEncuestaHandler);
router.post("/:slug/responder", responderEncuestaHandler);

module.exports = router;