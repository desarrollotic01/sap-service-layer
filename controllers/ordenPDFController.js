const { generarOrdenTrabajoPDF } = require("../services/OrdenTrabajoPdf");
const { OrdenTrabajo } = require("../db_connection"); // ajusta según tu modelo

const generarOT = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Traer orden COMPLETA (igual que ya haces)
    const orden = await OrdenTrabajo.findByPk(id, {
      include: [
        {
          association: "equipos",
          include: [
            { association: "equipo" },
            { association: "actividades" },
            {
              association: "trabajadores",
              include: [{ association: "trabajador" }],
            },
          ],
        },
      ],
    });

    if (!orden) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    // 🚀 Generar archivo
    const filePath = await generarOrdenTrabajoPDF(orden);

    return res.json({
      success: true,
      file: filePath,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando OT" });
  }
};

module.exports = {
  generarOT,
};