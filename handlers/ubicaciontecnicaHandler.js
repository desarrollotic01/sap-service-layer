const UbicacionController = require("../controllers/ubicacionTecnicaController");

const crearUbicacion = async (req, res) => {
  try {
    const result = await UbicacionController.crear(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const listarUbicaciones = async (_req, res) => {
  const result = await UbicacionController.listar();
  res.json(result);
};

const obtenerUbicacion = async (req, res) => {
  const result = await UbicacionController.obtener(req.params.id);
  if (!result)
    return res.status(404).json({ message: "Ubicación no encontrada" });

  res.json(result);
};

const actualizarUbicacion = async (req, res) => {
  try {
    const result = await UbicacionController.actualizar(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const eliminarUbicacion = async (req, res) => {
  try {
    await UbicacionController.eliminar(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearUbicacion,
  listarUbicaciones,
  obtenerUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
};
