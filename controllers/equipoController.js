const {
  Equipo,
  Cliente,
  Familia,
  Adjunto,
  Pais,
  sequelize,
  PlanMantenimiento
} = require("../db_connection");

const crear = async (data) => {
  if (!data.numeroOV) {
    throw new Error("El número de OV es obligatorio");
  }

  if (!data.clienteId) {
    throw new Error("El cliente es obligatorio");
  }

  if (!data.paisId) {
    throw new Error("El país es obligatorio");
  }

  if (!data.tipoEquipoPropiedad) {
    throw new Error("El tipo de equipo es obligatorio");
  }

  return await sequelize.transaction(async (t) => {
    // ✅ separar planes
    const { planesMantenimientoIds, ...equipoData } = data;

    const equipo = await Equipo.create(equipoData, { transaction: t });

    // ✅ vincular planes (si vienen)
 if (planesMantenimientoIds !== undefined) {
  await equipo.setPlanesMantenimiento(planesMantenimientoIds, {
    transaction: t,
  });
}


    // ✅ devolver con planes
    return await Equipo.findByPk(equipo.id, {
      include: [
        { model: Cliente, as: "cliente", attributes: ["id", "razonSocial"] },
        { model: Familia, as: "familia", attributes: ["id", "nombre"] },
        { model: Pais, as: "pais", attributes: ["id", "codigo", "nombre"] },
        { model: Adjunto, as: "adjuntos" },
        { model: sequelize.models.PlanMantenimiento, as: "planesMantenimiento" },
      ],
      transaction: t,
    });
  });
};


const listar = async () => {
  return Equipo.findAll({
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial"],
      },
      {
        model: Familia,
        as: "familia",
        attributes: ["id", "nombre"],
      },
      {
        model: Pais,
        as: "pais",
        attributes: ["id", "codigo", "nombre"],
      },
      {
        model: Adjunto,
        as: "adjuntos",
      },

      {
  model:PlanMantenimiento,
  as: "planesMantenimiento",
  attributes: ["id", "codigoPlan", "nombre", "tipo"],
},

    ],
    order: [["createdAt", "DESC"]],
  });
};

const obtener = async (id) => {
  return Equipo.findByPk(id, {
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial"],
      },
      {
        model: Familia,
        as: "familia",
        attributes: ["id", "nombre"],
      },
      {
        model: Pais,
        as: "pais",
        attributes: ["id", "codigo", "nombre"],
      },
      {
        model: Adjunto,
        as: "adjuntos",
      },

      {
  model:PlanMantenimiento,
  as: "planesMantenimiento",
  attributes: ["id", "codigoPlan", "nombre", "tipo"],
},

    ],
  });
};

const actualizar = async (id, data) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  return await sequelize.transaction(async (t) => {
    const { planesMantenimientoIds, ...equipoData } = data;

    // ✅ actualizar datos base
    await equipo.update(equipoData, { transaction: t });

    // ✅ actualizar planes si vienen
    if (planesMantenimientoIds) {
      await equipo.setPlanesMantenimiento(planesMantenimientoIds, {
        transaction: t,
      });
    }

    // ✅ devolver actualizado
    return await obtener(id);
  });
};

const eliminar = async (id) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  await sequelize.transaction(async (t) => {
    await equipo.destroy({ transaction: t });
  });
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};
