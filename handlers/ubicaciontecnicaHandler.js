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

const getUbicacionesByClienteIdHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const data = await UbicacionController.GetUbicacionesTecnicasByClienteId(clienteId);

    return res.status(200).json({
      message: "Ubicaciones técnicas del cliente obtenidas correctamente",
      data,
    });
  } catch (error) {
    console.error("Error getUbicacionesByClienteIdHandler:", error);
    return res.status(500).json({
      error: "Error al obtener las ubicaciones técnicas del cliente",
    });
  }
};

module.exports = {
  crearUbicacion,
  listarUbicaciones,
  obtenerUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
  getUbicacionesByClienteIdHandler,
};
