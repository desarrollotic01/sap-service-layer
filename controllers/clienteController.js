const { Cliente } = require("../db_connection");

const crear = async (data) => {
  return Cliente.create(data);
};

const listar = async () => {
  return Cliente.findAll({ order: [["razonSocial", "ASC"]] });
};

const obtener = async (id) => {
  return Cliente.findByPk(id);
};

const actualizar = async (id, data) => {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error("Cliente no encontrado");

  await cliente.update(data);
  return cliente;
};

const eliminar = async (id) => {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error("Cliente no encontrado");

  await cliente.destroy();
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
