const EquipoController = require("../controllers/equipoController");

const crearEquipo = async (req, res) => {
  try {
    const result = await EquipoController.crear(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listarEquipos = async (_req, res) => {
  try {
    const result = await EquipoController.listar();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const obtenerEquipo = async (req, res) => {
  try {
    const result = await EquipoController.obtener(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Equipo no encontrado" });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const actualizarEquipo = async (req, res) => {
  try {
    const result = await EquipoController.actualizar(
      req.params.id,
      req.body
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const eliminarEquipo = async (req, res) => {
  try {
    await EquipoController.eliminar(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearEquipo,
  listarEquipos,
  obtenerEquipo,
  actualizarEquipo,
  eliminarEquipo,
};
