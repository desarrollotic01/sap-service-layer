const { Router } = require("express");
const { getAllRubrosHandler } = require("../handlers/rubroHandler");

const rubroRouter = Router();

rubroRouter.get("/", getAllRubrosHandler);

module.exports = rubroRouter;