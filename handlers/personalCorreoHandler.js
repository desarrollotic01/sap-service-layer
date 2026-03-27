const { PersonalCorreo } = require("../db_connection");

// GET ALL
const getAll = async () => {
  return await PersonalCorreo.findAll({
    where: { activo: true },
    order: [["nombre", "ASC"]],
  });
};

// GET BY ID
const getById = async (id) => {
  const data = await PersonalCorreo.findByPk(id);
  if (!data) throw new Error("No encontrado");
  return data;
};

// CREATE
const create = async (payload) => {
  return await PersonalCorreo.create(payload);
};

// UPDATE
const update = async (id, payload) => {
  const data = await PersonalCorreo.findByPk(id);
  if (!data) throw new Error("No encontrado");

  await data.update(payload);
  return data;
};

// DELETE (soft delete recomendado)
const remove = async (id) => {
  const data = await PersonalCorreo.findByPk(id);
  if (!data) throw new Error("No encontrado");

  await data.update({ activo: false });
  return { message: "Eliminado" };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};