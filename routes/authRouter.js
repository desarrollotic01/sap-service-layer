const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const authHttpHandler = require("../handlers/authHttpHandler");

// LOGIN (publico)
router.post("/login", authHttpHandler.loginHandler);

// ME (protegido)
router.get("/me", auth, authHttpHandler.meHandler);

module.exports = router;
