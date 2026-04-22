const { Op } = require("sequelize");
const { siguienteNumero } = require("../utils/contadores");
const {
  sequelize,
  Aviso,
  Usuario,
  AvisoEquipo,
  AvisoUbicacion,
  Tratamiento,
  Equipo,
  UbicacionTecnica,
  Pais,
  GuiaMantenimiento,
  GuiaMantenimientoProgramacion,
  Cliente,
  Trabajador,
  OrdenTrabajo,
} = require("../db_connection");

const ESTADOS_AVISO_VALIDOS = [
  "creado",
  "tratado",
  "con OT",
  "rechazado",
  "finalizado",
  "finalizado sin facturacion",
  "facturado",
];

const TIPOS_AVISO_VALIDOS = ["mantenimiento", "instalacion", "venta"];
const PRIORIDADES_VALIDAS = ["Baja", "Media", "Alta"];
const TIPOS_MANTENIMIENTO_VALIDOS = [
  "Preventivo",
  "Correctivo",
  "Mejora",
  "Predictivo",
];

const PRODUCTOS_VALIDOS = [
  "Racks",
  "Vehiculo",
  "Autosat",
  "Techo y Cerramiento",
  "Equipos Propios",
  "Sanitarias",
  "HVAC",
  "DACI",
  "ACI",
  "Datos y Comunicaciones",
  "Eléctrico",
  "Pisos y Estructuras",
];

const buildWhereAvisosPorOrigen = (origenAviso, filtros = {}) => {
  const where = {
    origenAviso,
  };

  if (filtros.estadoAviso) {
    where.estadoAviso = filtros.estadoAviso;
  }

  if (filtros.tipoAviso) {
    where.tipoAviso = filtros.tipoAviso;
  }

  if (filtros.prioridad) {
    where.prioridad = filtros.prioridad;
  }

  if (filtros.tipoMantenimiento) {
    where.tipoMantenimiento = filtros.tipoMantenimiento;
  }

  if (filtros.producto) {
    where.producto = filtros.producto;
  }

  if (filtros.paisId) {
    where.paisId = filtros.paisId;
  }

  if (filtros.solicitanteId) {
    where.solicitanteId = filtros.solicitanteId;
  }

  if (filtros.creadoPor) {
    where.creadoPor = filtros.creadoPor;
  }

  if (filtros.guiaMantenimientoId) {
    where.guiaMantenimientoId = filtros.guiaMantenimientoId;
  }

  if (filtros.guiaMantenimientoProgramacionId) {
    where.guiaMantenimientoProgramacionId =
      filtros.guiaMantenimientoProgramacionId;
  }

  if (filtros.numeroAviso) {
    where.numeroAviso = {
      [Op.iLike]: `%${filtros.numeroAviso.trim()}%`,
    };
  }

  if (filtros.descripcion) {
    where[Op.or] = [
      { descripcionResumida: { [Op.iLike]: `%${filtros.descripcion.trim()}%` } },
      { descripcion: { [Op.iLike]: `%${filtros.descripcion.trim()}%` } },
    ];
  }

  if (filtros.fechaDesde && filtros.fechaHasta) {
    where.fechaAtencion = {
      [Op.between]: [filtros.fechaDesde, filtros.fechaHasta],
    };
  } else if (filtros.fechaDesde) {
    where.fechaAtencion = {
      [Op.gte]: filtros.fechaDesde,
    };
  } else if (filtros.fechaHasta) {
    where.fechaAtencion = {
      [Op.lte]: filtros.fechaHasta,
    };
  }

  return where;
};

const buildIncludeAvisos = () => {
  return [
    {
      model: Cliente,
      as: "clienteData",
      attributes: ["id", "razonSocial", "sapCode"],
      required: false,
    },
    {
      model: Usuario,
      as: "creador",
      attributes: ["id", "nombreApellido"],
      required: false,
    },
    {
      model: Usuario,
      as: "solicitante",
      attributes: ["id", "nombreApellido"],
      required: false,
    },
    {
      model: Trabajador,
      as: "supervisor",
      attributes: ["id", "nombre", "apellido"],
      required: false,
    },
    {
      model: Pais,
      as: "pais",
      required: false,
    },
    {
      model: AvisoEquipo,
      as: "equiposRelacion",
      required: false,
      include: [
        {
          model: Equipo,
          as: "equipo",
          required: false,
        },
      ],
    },
    {
      model: AvisoUbicacion,
      as: "ubicacionesRelacion",
      required: false,
      include: [
        {
          model: UbicacionTecnica,
          as: "ubicacion",
          required: false,
        },
      ],
    },
    {
      model: Tratamiento,
      as: "tratamientos",
      required: false,
    },
    {
      model: GuiaMantenimiento,
      as: "guiaMantenimiento",
      required: false,
    },
    {
      model: GuiaMantenimientoProgramacion,
      as: "programacionGuia",
      required: false,
    },
    {
      model: OrdenTrabajo,
      as: "ordenesTrabajo",
      required: false,
      attributes: ["id", "numeroOT", "estado", "fechaCierre"],
    },
  ];
};

const getAvisosManualController = async (filtros = {}) => {
  const avisos = await Aviso.findAll({
    where: buildWhereAvisosPorOrigen("manual", filtros),
    include: buildIncludeAvisos(),
    order: [
      ["createdAt", "DESC"],
      ["fechaAtencion", "DESC"],
    ],
  });

  return avisos;
};

const getAvisosGuiaController = async (filtros = {}) => {
  const avisos = await Aviso.findAll({
    where: buildWhereAvisosPorOrigen("guia", filtros),
    include: buildIncludeAvisos(),
    order: [
      ["createdAt", "DESC"],
      ["fechaAtencion", "DESC"],
    ],
  });

  return avisos;
};

/* =========================
   CREAR AVISO
========================= */
async function crearAviso(data, userId) {
  const t = await sequelize.transaction();

  try {
    const { equipos = [], ubicaciones = [], ...avisoData } = data;

    // Correlativo global AV001, AV002, ...
    avisoData.numeroAviso = await siguienteNumero("AV", "AV", 3, t);

    const aviso = await Aviso.create(
      {
        ...avisoData,
        estadoAviso: "creado",
        creadoPor: userId,
        solicitanteId: userId,
      },
      { transaction: t }
    );

    // 🔹 Crear relaciones con equipos
    if (equipos.length > 0) {
      const relacionesEquipos = equipos.map((equipoId) => ({
        avisoId: aviso.id,
        equipoId,
      }));

      await AvisoEquipo.bulkCreate(relacionesEquipos, {
        transaction: t,
      });
    }

    // 🔹 Crear relaciones con ubicaciones
    if (ubicaciones.length > 0) {
      const relacionesUbicaciones = ubicaciones.map((ubicacionId) => ({
        avisoId: aviso.id,
        ubicacionId,
      }));

      await AvisoUbicacion.bulkCreate(relacionesUbicaciones, {
        transaction: t,
      });
    }

    await t.commit();
    return aviso;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/* =========================
   GET TODOS
========================= */
async function obtenerAvisos() {
  return await Aviso.findAll({
    include: [
      {
        model: Usuario,
        as: "creador",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        model: Usuario,
        as: "solicitante",
        attributes: ["id", "alias", "nombreApellido"],
      },
      {
        association: "equiposRelacion",
        attributes: ["id", "equipoId"],
        include: [
          {
            model: Equipo,
            as: "equipo",
            attributes: ["id", "nombre", "codigo", "tipoEquipo"], 
          },
        ],
      },
      {
        association: "ubicacionesRelacion",
        attributes: ["id", "ubicacionId"],
        include: [
          {
            model: UbicacionTecnica,
            as: "ubicacion",
            attributes: ["id", "nombre", "codigo"],
          },
        ],
      },
      {
        association: "tratamientos",
        attributes: ["id"],
      },

      
       {
         association: "pais",
      attributes: ["id", "codigo", "nombre"],
       },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/* =========================
   GET POR ID
========================= */
async function obtenerAvisoPorId(id) {
  return await Aviso.findByPk(id, {
    include: [
      { model: Usuario, as: "creador", attributes: ["id", "alias", "nombreApellido"] },
      { model: Usuario, as: "solicitante", attributes: ["id", "alias", "nombreApellido"] },
      {
        association: "equiposRelacion",
        attributes: ["id", "equipoId"],
        include: [{ model: Equipo, as: "equipo", attributes: ["id","nombre","codigo","tipoEquipo"] }],
      },
      {
        association: "ubicacionesRelacion",
        attributes: ["id", "ubicacionId"],
        include: [{ model: UbicacionTecnica, as: "ubicacion", attributes: ["id","nombre","codigo","nivel"] }],
      },
    ],
  });
}

/* =========================
   UPDATE
========================= */
async function actualizarAviso(id, data) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  const t = await sequelize.transaction();

  try {
    const { equipos, ...avisoData } = data;

    // actualizar campos aviso
    await aviso.update(avisoData, { transaction: t });

    // actualizar equipos si vienen
    if (equipos) {
      // borrar relaciones actuales
      await AvisoEquipo.destroy({
        where: { avisoId: id },
        transaction: t,
      });

      // crear nuevas
      if (equipos.length > 0) {
        const relaciones = equipos.map((equipoId) => ({
          avisoId: id,
          equipoId,
        }));

        await AvisoEquipo.bulkCreate(relaciones, { transaction: t });
      }
    }

    await t.commit();
    return aviso;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/* =========================
   DELETE
========================= */
async function eliminarAviso(id) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) return null;

  const t = await sequelize.transaction();

  try {
    // borrar relaciones primero
    await AvisoEquipo.destroy({
      where: { avisoId: id },
      transaction: t,
    });

    // borrar aviso
    await aviso.destroy({ transaction: t });

    await t.commit();
    return true;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}


async function actualizarEstadoAviso(id, estado) {
  const aviso = await Aviso.findByPk(id);
  if (!aviso) throw new Error("Aviso no encontrado");

  aviso.estadoAviso = estado;
  await aviso.save();

  return aviso;
}


/* =========================
   EXPORTS
========================= */
module.exports = {
  crearAviso,
  obtenerAvisos,
  obtenerAvisoPorId,
  actualizarAviso,
  eliminarAviso,
  actualizarEstadoAviso,
   getAvisosManualController,
  getAvisosGuiaController,
  ESTADOS_AVISO_VALIDOS,
  TIPOS_AVISO_VALIDOS,
  PRIORIDADES_VALIDAS,
  TIPOS_MANTENIMIENTO_VALIDOS,
  PRODUCTOS_VALIDOS,
};
