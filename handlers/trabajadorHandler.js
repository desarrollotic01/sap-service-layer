const TrabajadorController = require("../controllers/trabajadorController");

const crearTrabajador = async (req, res) => {
  try {
    const trabajador = await TrabajadorController.crear(req.body);
    res.status(201).json(trabajador);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const listarTrabajadores = async (req, res) => {
  try {
    const trabajadores = await TrabajadorController.listar(req.query);
    res.json(trabajadores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const obtenerTrabajador = async (req, res) => {
  try {
    const trabajador = await TrabajadorController.obtener(req.params.id);
    if (!trabajador) {
      return res.status(404).json({ message: "Trabajador no encontrado" });
    }
    res.json(trabajador);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const actualizarTrabajador = async (req, res) => {
  try {
    const trabajador = await TrabajadorController.actualizar(
      req.params.id,
      req.body
    );
    res.json(trabajador);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const desactivarTrabajador = async (req, res) => {
  try {
    await TrabajadorController.desactivar(req.params.id);
    res.json({ message: "Trabajador desactivado" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  crearTrabajador,
  listarTrabajadores,
  obtenerTrabajador,
  actualizarTrabajador,
  desactivarTrabajador,
};
