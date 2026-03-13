const { Item, Rubro } = require("../db_connection");

const getAllItemsController = async () => {
  const items = await Item.findAll({
    where: { activoSAP: true },
    include: [
      {
        model: Rubro,
        as: "rubro",
        attributes: ["sapCode", "nombre"],
        required: false,
      },
    ],
    order: [["nombre", "ASC"]],
  });

  return items;
};

module.exports = {
  getAllItemsController,
};