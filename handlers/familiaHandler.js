const FamiliaController = require("../controllers/familiaController");

const crearFamilia = async (req, res) => {
  try {
    const result = await FamiliaController.crear(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const listarFamilias = async (_req, res) => {
  const result = await FamiliaController.listar();
  res.json(result);
};

const obtenerFamilia = async (req, res) => {
  const result = await FamiliaController.obtener(req.params.id);
  if (!result) {
    return res.status(404).json({ message: "Familia no encontrada" });
  }
  res.json(result);
};

const actualizarFamilia = async (req, res) => {
  try {
    const result = await FamiliaController.actualizar(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const eliminarFamilia = async (req, res) => {
  try {
    await FamiliaController.eliminar(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearFamilia,
  listarFamilias,
  obtenerFamilia,
  actualizarFamilia,
  eliminarFamilia,
};
