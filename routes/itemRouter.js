const { Router } = require("express");
const { getAllItemsHandler } = require("../handlers/itemHandler");
const { getWarehousesByItem } = require("../controllers/itemController");

const itemRouter = Router();

itemRouter.get("/", getAllItemsHandler);
itemRouter.get("/:itemCode/warehouses", getWarehousesByItem);

module.exports = itemRouter;