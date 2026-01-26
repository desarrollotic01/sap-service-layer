const EquipoController = require("../controllers/equipoController");

const crearEquipo = async (req, res) => {
  try {
    const result = await EquipoController.crear(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const listarEquipos = async (_req, res) => {
  const result = await EquipoController.listar();
  res.json(result);
};

const obtenerEquipo = async (req, res) => {
  const result = await EquipoController.obtener(req.params.id);
  if (!result)
    return res.status(404).json({ message: "Equipo no encontrado" });

  res.json(result);
};

const actualizarEquipo = async (req, res) => {
  try {
    const result = await EquipoController.actualizar(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const eliminarEquipo = async (req, res) => {
  try {
    await EquipoController.eliminar(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearEquipo,
  listarEquipos,
  obtenerEquipo,
  actualizarEquipo,
  eliminarEquipo,
};
