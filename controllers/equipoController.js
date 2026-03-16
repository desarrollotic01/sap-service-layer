const {
  Equipo,
  Cliente,
  Familia,
  Adjunto,
  Pais,
  Sede,
  sequelize,
  PlanMantenimiento,
  PlanMantenimientoActividad,
} = require("../db_connection");

const obtenerEquipoCompleto = async (id, transaction = null) => {
  return await Equipo.findByPk(id, {
    include: [
      { model: Cliente, as: "cliente", attributes: ["id", "razonSocial"] },
      { model: Familia, as: "familia", attributes: ["id", "nombre"] },
      { model: Pais, as: "pais", attributes: ["id", "codigo", "nombre"] },
      { model: Adjunto, as: "adjuntos" },
      {
        model: PlanMantenimiento,
        as: "planesMantenimiento",
        attributes: [
          "id",
          "codigoPlan",
          "nombre",
          "tipo",
          "activo",
          "esEspecifico",
          "equipoObjetivoId",
        ],
        through: { attributes: [] },
        include: [
          {
            model: PlanMantenimientoActividad,
            as: "actividades",
          },
        ],
      },
    ],
    transaction,
  });
};

const crear = async (data, files = []) => {
  return await sequelize.transaction(async (t) => {
    const { planesMantenimientoIds, ...equipoData } = data;

    const equipo = await Equipo.create(equipoData, { transaction: t });

    if (planesMantenimientoIds !== undefined) {
      let planes = planesMantenimientoIds;

      if (typeof planesMantenimientoIds === "string") {
        try {
          planes = JSON.parse(planesMantenimientoIds);
        } catch {
          planes = [planesMantenimientoIds];
        }
      }

      if (Array.isArray(planes)) {
        await equipo.setPlanesMantenimiento(planes, { transaction: t });
      }
    }

    if (files && files.length > 0) {
  const adjuntosData = files.map((file) => ({
    nombre: file.originalname,
    url: `/uploads/equipos/${file.filename}`,
    extension: file.mimetype,
    categoria: "OTRO",
    equipoId: equipo.id,
    mostrarEnPortal: false,
    tituloPortal: null,
    descripcionPortal: null,
    ordenPortal: 0,
  }));

  await Adjunto.bulkCreate(adjuntosData, { transaction: t });
}

    return await obtenerEquipoCompleto(equipo.id, t);
  });
};

const listar = async () => {
  return await Equipo.findAll({
    include: [
      { model: Cliente, as: "cliente", attributes: ["id", "razonSocial"] },
      { model: Familia, as: "familia", attributes: ["id", "nombre"] },
      { model: Pais, as: "pais", attributes: ["id", "codigo", "nombre"] },
      { model: Adjunto, as: "adjuntos" },
      {
        model: PlanMantenimiento,
        as: "planesMantenimiento",
        attributes: [
          "id",
          "codigoPlan",
          "nombre",
          "tipo",
          "activo",
          "esEspecifico",
          "equipoObjetivoId",
        ],
        through: { attributes: [] },
        include: [
          {
            model: PlanMantenimientoActividad,
            as: "actividades",
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const obtener = async (id) => {
  return await obtenerEquipoCompleto(id);
};

const actualizar = async (id, data, files = []) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  return await sequelize.transaction(async (t) => {
    const { planesMantenimientoIds, ...equipoData } = data;

    await equipo.update(equipoData, { transaction: t });

    if (planesMantenimientoIds !== undefined) {
      let planes = planesMantenimientoIds;

      if (typeof planesMantenimientoIds === "string") {
        try {
          planes = JSON.parse(planesMantenimientoIds);
        } catch {
          planes = [planesMantenimientoIds];
        }
      }

      if (Array.isArray(planes)) {
        await equipo.setPlanesMantenimiento(planes, { transaction: t });
      }
    }

    if (files && files.length > 0) {
      const adjuntosData = files.map((file) => ({
        nombre: file.originalname,
        url: `/uploads/equipos/${file.filename}`,
        extension: file.mimetype,
        categoria: "OTRO",
        equipoId: equipo.id,
      }));

      await Adjunto.bulkCreate(adjuntosData, { transaction: t });
    }

    return await obtenerEquipoCompleto(id, t);
  });
};

const eliminar = async (id) => {
  const equipo = await Equipo.findByPk(id);
  if (!equipo) throw new Error("Equipo no encontrado");

  await sequelize.transaction(async (t) => {
    await equipo.destroy({ transaction: t });
  });
};

const obtenerPlanesMantenimientoPorEquipo = async (equipoId) => {
  if (!equipoId) throw new Error("El id del equipo es obligatorio");

  const equipo = await Equipo.findByPk(equipoId, {
    include: [
      {
        model: PlanMantenimiento,
        as: "planesMantenimiento",
        attributes: [
          "id",
          "codigoPlan",
          "nombre",
          "tipo",
          "activo",
          "esEspecifico",
          "equipoObjetivoId",
        ],
        where: { activo: true },
        required: false,
        through: { attributes: [] },
        include: [
          {
            model: PlanMantenimientoActividad,
            as: "actividades",
          },
        ],
      },
    ],
  });

  if (!equipo) throw new Error("Equipo no encontrado");

  return equipo.planesMantenimiento || [];
};


/* =========================================================
   GET EQUIPOS BY CLIENTE ID
========================================================= */
const GetEquiposByClienteId = async (clienteId) => {
  return await Equipo.findAll({
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
        model: Familia,
        as: "familia",
        attributes: ["id", "nombre"],
      },
      {
        model: Adjunto,
        as: "adjuntos",
        required: false,
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


const actualizarAdjuntosPortalEquipo = async (equipoId, adjuntosPortal = []) => {
  return await sequelize.transaction(async (t) => {
    const equipo = await Equipo.findByPk(equipoId, { transaction: t });

    if (!equipo) {
      throw new Error("El equipo no existe");
    }

    await Adjunto.update(
      {
        mostrarEnPortal: false,
        tituloPortal: null,
        descripcionPortal: null,
        ordenPortal: 0,
      },
      {
        where: { equipoId },
        transaction: t,
      }
    );

    for (const item of adjuntosPortal) {
      await Adjunto.update(
        {
          mostrarEnPortal: true,
          tituloPortal: item.tituloPortal ? String(item.tituloPortal).trim() : null,
          descripcionPortal: item.descripcionPortal
            ? String(item.descripcionPortal).trim()
            : null,
          ordenPortal: Number(item.ordenPortal) || 0,
        },
        {
          where: {
            id: item.adjuntoId,
            equipoId,
          },
          transaction: t,
        }
      );
    }

    return await Equipo.findByPk(equipoId, {
      include: [
        {
          model: Adjunto,
          as: "adjuntos",
        },
      ],
      transaction: t,
    });
  });
};

const obtenerEquipoPortal = async (equipoId) => {
  const equipo = await Equipo.findByPk(equipoId, {
    include: [
      {
        model: Adjunto,
        as: "adjuntos",
        where: {
          mostrarEnPortal: true,
        },
        required: false,
        attributes: [
          "id",
          "nombre",
          "url",
          "extension",
          "categoria",
          "tituloPortal",
          "descripcionPortal",
          "ordenPortal",
          "createdAt",
        ],
      },
    ],
    order: [[{ model: Adjunto, as: "adjuntos" }, "ordenPortal", "ASC"]],
  });

  return equipo;
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
  obtenerPlanesMantenimientoPorEquipo,
  GetEquiposByClienteId,
  actualizarAdjuntosPortalEquipo,
  obtenerEquipoPortal,
};