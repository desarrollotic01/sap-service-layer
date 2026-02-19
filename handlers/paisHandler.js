const PaisController = require("../controllers/paisController");

const crearPais = async (req, res) => {
  try {
    const result = await PaisController.crear(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const listarPaises = async (req, res) => {
  try {
    const soloActivos = req.query.activos !== "false";
    const result = await PaisController.listar({ soloActivos });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const obtenerPais = async (req, res) => {
  try {
    const result = await PaisController.obtener(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const actualizarPais = async (req, res) => {
  try {
    const result = await PaisController.actualizar(
      req.params.id,
      req.body
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const eliminarPais = async (req, res) => {
  try {
    await PaisController.eliminar(req.params.id);
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearPais,
  listarPaises,
  obtenerPais,
  actualizarPais,
  eliminarPais,
};
