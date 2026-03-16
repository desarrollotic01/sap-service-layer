const { UbicacionTecnica,Cliente , Sede ,Pais } = require("../db_connection");

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


/* =========================================================
   GET UBICACIONES TECNICAS BY CLIENTE ID
========================================================= */
const GetUbicacionesTecnicasByClienteId = async (clienteId) => {
  return await UbicacionTecnica.findAll({
    where: { clienteId },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Pais,
        as: "pais",
        attributes: ["id", "codigo", "nombre"],
      },
      {
        model: Sede,
        as: "sedeRelacion",
        required: false,
        attributes: ["id", "nombre", "direccion"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
  GetUbicacionesTecnicasByClienteId
};
