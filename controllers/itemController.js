const { Item, Rubro } = require("../db_connection");
const { getItemWarehouses } = require("../sap/sapItems");

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


async function getWarehousesByItem(req, res) {
  try {
    const { itemCode } = req.params;

    if (!itemCode) {
      return res.status(400).json({
        success: false,
        message: "ItemCode es requerido",
      });
    }

    const warehouses = await getItemWarehouses(itemCode);

    // 🔥 limpiar respuesta (solo lo útil)
    const result = warehouses.map((w) => ({
      warehouseCode: w.WarehouseCode,
      inStock: w.InStock,
      committed: w.Committed,
      ordered: w.Ordered,
    }));

    return res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("❌ Error obteniendo warehouses:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error obteniendo warehouses",
    });
  }
}


module.exports = {
  getAllItemsController,
  getWarehousesByItem,
};