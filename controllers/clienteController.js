const { Cliente, Contacto } = require("../db_connection");

const crear = async (data) => {
  return Cliente.create(data);
};

const listar = async () => {
  return Cliente.findAll({
    include: [
      {
        model: Contacto,
        as: "contactos",
      },
    ],
    order: [["razonSocial", "ASC"]],
  });
};

const obtener = async (id) => {
  const cliente = await Cliente.findByPk(id, {
    include: [
      {
        model: Contacto,
        as: "contactos",
      },
    ],
  });

  if (!cliente) throw new Error("Cliente no encontrado");

  return cliente;
};

const obtenerPorSapCode = async (sapCode) => {
  return Cliente.findOne({
    where: { sapCode },
  });
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

  await cliente.update({
    estado: "Inactivo",
  });

  return cliente;
};

module.exports = {
  crear,
  listar,
  obtener,
  obtenerPorSapCode,
  actualizar,
  eliminar,
};