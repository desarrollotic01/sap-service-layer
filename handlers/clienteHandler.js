const ClienteController = require("../controllers/clienteController");

const crearCliente = async (req, res) => {
  try {
    const result = await ClienteController.crear(req.body);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

const listarClientes = async (_req, res) => {
  const result = await ClienteController.listar();
  res.json(result);
};

const obtenerCliente = async (req, res) => {
  const result = await ClienteController.obtener(req.params.id);
  if (!result) return res.status(404).json({ message: "No encontrado" });
  res.json(result);
};

const actualizarCliente = async (req, res) => {
  try {
    const result = await ClienteController.actualizar(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

const eliminarCliente = async (req, res) => {
  try {
    await ClienteController.eliminar(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

module.exports = {
  crearCliente,
  listarClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
};
