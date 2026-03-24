// 👉 IMPORTANTE: Agregamos PlanMantenimiento a la importación
const { UbicacionTecnica, PlanMantenimiento } = require("../db_connection");

const crear = async (data) => {
  if (!data.codigo || !data.nombre) {
    throw new Error("Código y nombre son obligatorios");
  }

  // 1. Crear la ubicación básica
  const nuevaUbicacion = await UbicacionTecnica.create(data);

  // 2. Vincular los planes en la tabla intermedia (si vienen en el request)
  if (data.planesMantenimientoIds && data.planesMantenimientoIds.length > 0) {
    await nuevaUbicacion.setPlanesMantenimiento(data.planesMantenimientoIds);
  }

  // 3. Devolver la ubicación recién creada INCLUYENDO sus planes
  return UbicacionTecnica.findByPk(nuevaUbicacion.id, {
    include: [{
      model: PlanMantenimiento,
      as: "planesMantenimiento",
      through: { attributes: [] } // Esto evita traer datos basura de la tabla intermedia
    }]
  });
};

const listar = async () => {
  return UbicacionTecnica.findAll({
    order: [["codigo", "ASC"]],
    // 👉 Al incluir esto, tu frontend ya recibirá los planes en initialData
    include: [{
      model: PlanMantenimiento,
      as: "planesMantenimiento",
      through: { attributes: [] }
    }]
  });
};

const obtener = async (id) => {
  return UbicacionTecnica.findByPk(id, {
    include: [{
      model: PlanMantenimiento,
      as: "planesMantenimiento",
      through: { attributes: [] }
    }]
  });
};

const actualizar = async (id, data) => {
  const ubicacion = await UbicacionTecnica.findByPk(id);
  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  // 1. Actualizar los datos básicos
  await ubicacion.update(data);

  // 2. Actualizar las relaciones (setPlanesMantenimiento borra los viejos y pone los nuevos)
  if (data.planesMantenimientoIds) {
    await ubicacion.setPlanesMantenimiento(data.planesMantenimientoIds);
  }

  // 3. Devolver la ubicación actualizada con sus planes
  return UbicacionTecnica.findByPk(id, {
    include: [{
      model: PlanMantenimiento,
      as: "planesMantenimiento",
      through: { attributes: [] }
    }]
  });
};

const eliminar = async (id) => {
  const ubicacion = await UbicacionTecnica.findByPk(id);
  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  await ubicacion.destroy();
};

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