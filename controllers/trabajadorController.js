const { Trabajador } = require("../db_connection");
const { validate: isUUID } = require("uuid");

const crear = async (data) => {
  if (!data.nombre || !data.rol) {
    throw new Error("Nombre y rol son obligatorios");
  }

  return Trabajador.create({
    nombre: data.nombre,
    rol: data.rol,
    empresa: data.empresa,
    activo: true,
  });
};

const listar = async (query) => {
  const where = {};

  if (query.activo !== undefined) {
    where.activo = query.activo === "true";
  }

  if (query.rol) {
    where.rol = query.rol;
  }

  return Trabajador.findAll({
    where,
    order: [["nombre", "ASC"]],
  });
};

const obtener = async (id) => {
  if (!isUUID(id)) {
    throw new Error("ID inválido");
  }

  return Trabajador.findByPk(id);
};

const actualizar = async (id, data) => {
  if (!isUUID(id)) {
    throw new Error("ID inválido");
  }

  const trabajador = await Trabajador.findByPk(id);
  if (!trabajador) {
    throw new Error("Trabajador no encontrado");
  }

  await trabajador.update({
    nombre: data.nombre ?? trabajador.nombre,
    rol: data.rol ?? trabajador.rol,
    empresa: data.empresa ?? trabajador.empresa,
    activo: data.activo ?? trabajador.activo,
  });

  return trabajador;
};

const desactivar = async (id) => {
  if (!isUUID(id)) {
    throw new Error("ID inválido");
  }

  const trabajador = await Trabajador.findByPk(id);
  if (!trabajador) {
    throw new Error("Trabajador no encontrado");
  }

  await trabajador.update({ activo: false });
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  desactivar,
};
