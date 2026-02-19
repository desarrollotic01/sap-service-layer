const { Pais, sequelize } = require("../db_connection");

const crear = async (data) => {
  if (!data.codigo) {
    throw new Error("El código del país es obligatorio");
  }

  if (!data.nombre) {
    throw new Error("El nombre del país es obligatorio");
  }

  return await sequelize.transaction(async (t) => {
    const pais = await Pais.create(data, { transaction: t });
    return pais;
  });
};

const listar = async ({ soloActivos = true } = {}) => {
  const where = {};

  if (soloActivos) {
    where.activo = true;
  }

  return Pais.findAll({
    where,
    order: [["nombre", "ASC"]],
  });
};

const obtener = async (id) => {
  return Pais.findByPk(id);
};

const actualizar = async (id, data) => {
  const pais = await Pais.findByPk(id);
  if (!pais) throw new Error("País no encontrado");

  await sequelize.transaction(async (t) => {
    await pais.update(data, { transaction: t });
  });

  return pais;
};

const eliminar = async (id) => {
  const pais = await Pais.findByPk(id);
  if (!pais) throw new Error("País no encontrado");

  // 🔥 soft delete lógico recomendado
  await sequelize.transaction(async (t) => {
    await pais.update({ activo: false }, { transaction: t });
  });
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
