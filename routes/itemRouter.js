const { Router } = require("express");
const { getAllItemsHandler } = require("../handlers/itemHandler");

const itemRouter = Router();

itemRouter.get("/", getAllItemsHandler);

module.exports = itemRouter;