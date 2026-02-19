const { Familia, Equipo } = require("../db_connection");

const crear = async (data) => {
  if (!data.nombre) {
    throw new Error("El nombre de la familia es obligatorio");
  }

  return Familia.create(data);
};

const listar = async () => {
  return Familia.findAll({
    include: [
      {
        model: Equipo,
        as: "equipos",
        attributes: ["id", "codigo", "serie"],
      },
    ],
    order: [["nombre", "ASC"]],
  });
};

const obtener = async (id) => {
  return Familia.findByPk(id, {
    include: [
      {
        model: Equipo,
        as: "equipos",
      },
    ],
  });
};

const actualizar = async (id, data) => {
  const familia = await Familia.findByPk(id);
  if (!familia) throw new Error("Familia no encontrada");

  await familia.update(data);
  return familia;
};

const eliminar = async (id) => {
  const familia = await Familia.findByPk(id);
  if (!familia) throw new Error("Familia no encontrada");

  await familia.destroy();
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
