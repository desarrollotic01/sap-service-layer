const { Trabajador } = require("../db_connection");

// 1. SOLUCIÓN AL ERROR 400: Creamos la función isUUID para que Node.js no colapse
const isUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const crear = async (data) => {
  if (!data.nombre || !data.apellido || !data.dni || !data.rol) {
    throw new Error("Nombre, apellido, DNI y rol son obligatorios");
  }

  return Trabajador.create({
    nombre: data.nombre,
    apellido: data.apellido,
    dni: data.dni,
    fechaNacimiento: data.fechaNacimiento || null,
    zona: data.zona || null,
    direccion: data.direccion || null,
    rol: data.rol,
    empresa: data.empresa || null,
    activo: data.activo ?? true,
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

  // 2. SOLUCIÓN DE EDICIÓN: Agregamos todos los campos para que realmente se actualicen
  await trabajador.update({
    nombre: data.nombre ?? trabajador.nombre,
    apellido: data.apellido ?? trabajador.apellido,
    dni: data.dni ?? trabajador.dni,
    fechaNacimiento: data.fechaNacimiento !== undefined ? data.fechaNacimiento : trabajador.fechaNacimiento,
    zona: data.zona !== undefined ? data.zona : trabajador.zona,
    direccion: data.direccion !== undefined ? data.direccion : trabajador.direccion,
    rol: data.rol ?? trabajador.rol,
    empresa: data.empresa !== undefined ? data.empresa : trabajador.empresa,
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