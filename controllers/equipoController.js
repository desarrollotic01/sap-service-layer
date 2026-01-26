const { Equipo } = require("../db_connection");

const crear = async (data) => {
  if (!data.codigo || !data.nombre) {
    throw new Error("Código y nombre son obligatorios");
  }

  return Equipo.create(data);
};

const listar = async () => {
  return Equipo.findAll({
    order: [["nombre", "ASC"]],
  });
};

const obtener = async (id) => {
  return Equipo.findByPk(id);
};

const actualizar = async (id, data) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  await equipo.update(data);
  return equipo;
};

const eliminar = async (id) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  await equipo.destroy();
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
