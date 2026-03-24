const { SapRubro, SapPaqueteTrabajo } = require("../db_connection");

// 🔥 GET SAP RUBROS
async function GetSapRubro(req, res) {
  try {
    const rubros = await SapRubro.findAll({
      where: { activo: true },
      attributes: ["id", "codigo", "descripcion"],
      order: [["codigo", "ASC"]],
    });

    res.json(rubros);
  } catch (error) {
    console.error("Error GetSapRubro:", error);
    res.status(500).json({ error: "Error obteniendo rubros SAP" });
  }
}

// 🔥 GET SAP PAQUETES
async function GetSapPaqueteTrabajo(req, res) {
  try {
    const paquetes = await SapPaqueteTrabajo.findAll({
      where: { activo: true },
      attributes: ["id", "codigo", "descripcion"],
      order: [["codigo", "ASC"]],
    });

    res.json(paquetes);
  } catch (error) {
    console.error("Error GetSapPaqueteTrabajo:", error);
    res.status(500).json({ error: "Error obteniendo paquetes SAP" });
  }
}

module.exports = {
  GetSapRubro,
  GetSapPaqueteTrabajo,
};