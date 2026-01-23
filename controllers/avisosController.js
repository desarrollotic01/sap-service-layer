const { Aviso, Usuario } = require("../db_connection");

async function crearAviso(data, userId) {
  const aviso = await Aviso.create({
    ...data,
    creadoPor: userId,
  });

  return aviso;
}

async function obtenerAvisos() {
  return await Aviso.findAll({
    include: {
      model: Usuario,
      as: "creador",
      attributes: ["id", "alias", "nombreApellido"],
    },
    order: [["createdAt", "DESC"]],
  });
}

async function obtenerAvisoPorId(id) {
  return await Aviso.findByPk(id, {
    include: {
      model: Usuario,
      as: "creador",
      attributes: ["id", "alias", "nombreApellido"],
    },
  });
}

async function actualizarAviso(id, data) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  await aviso.update(data);
  return aviso;
}

async function eliminarAviso(id) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  await aviso.destroy();
  return true;
}

module.exports = {
  crearAviso,
  obtenerAvisos,
  obtenerAvisoPorId,
  actualizarAviso,
  eliminarAviso,
};
