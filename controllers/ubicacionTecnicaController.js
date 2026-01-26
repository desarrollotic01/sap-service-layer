const { UbicacionTecnica } = require("../db_connection");

const crear = async (data) => {
  if (!data.codigo || !data.nombre) {
    throw new Error("Código y nombre son obligatorios");
  }

  return UbicacionTecnica.create(data);
};

const listar = async () => {
  return UbicacionTecnica.findAll({
    order: [["codigo", "ASC"]],
  });
};

const obtener = async (id) => {
  return UbicacionTecnica.findByPk(id);
};

const actualizar = async (id, data) => {
  const ubicacion = await UbicacionTecnica.findByPk(id);
  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  await ubicacion.update(data);
  return ubicacion;
};

const eliminar = async (id) => {
  const ubicacion = await UbicacionTecnica.findByPk(id);
  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  await ubicacion.destroy();
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
