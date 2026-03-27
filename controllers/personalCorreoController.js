const handler = require("../handlers/personalCorreoHandler");

// GET ALL
const getAll = async (req, res) => {
  try {
    const data = await handler.getAll();
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET BY ID
const getById = async (req, res) => {
  try {
    const data = await handler.getById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// CREATE
const create = async (req, res) => {
  try {
    const data = await handler.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// UPDATE
const update = async (req, res) => {
  try {
    const data = await handler.update(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const data = await handler.remove(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};