const express = require("express");
const router = express.Router();
const handler = require("../handlers/authHttpHandler");

router.post("/login", handler.loginHandler);

module.exports = router;
