const { Router } = require("express");
const { getAllOrdenesVentaHandler } = require("../handlers/ordenVentaHandler");

const ordenVentaRouter = Router();

ordenVentaRouter.get("/", getAllOrdenesVentaHandler);

module.exports = ordenVentaRouter;
