const { procesarArchivos } = require("../handlers/adjuntoHandler");

async function uploadAdjuntosController(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No se enviaron archivos" });
    }

    const archivos = await procesarArchivos(req.files);

    res.json(archivos);
  } catch (error) {
    console.error("Error upload adjuntos:", error);
    res.status(500).json({ message: "Error subiendo archivos" });
  }
}

module.exports = {
  uploadAdjuntosController,
};
