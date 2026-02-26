const {
  PlanMantenimiento,
  PlanMantenimientoActividad,
  PlanActividadItem,
  Adjunto,
  Equipo,
  EquipoPlanMantenimiento,
  sequelize,
} = require("../db_connection");

const { Op } = require("sequelize");

const normalize = (v) => (v === "" || v === undefined ? null : v);

/**
 * Genera código único para plan
 * Formato: PLAN-YYYY-0001
 */
const generarCodigoPlan = async () => {
  const year = new Date().getFullYear();
  const prefix = `PLAN-${year}-`;

  const ultimoPlan = await PlanMantenimiento.findOne({
    where: {
      codigoPlan: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["codigoPlan", "DESC"]],
  });

  let nuevoNumero = 1;

  if (ultimoPlan?.codigoPlan) {
    const ultimoNumero = parseInt(ultimoPlan.codigoPlan.replace(prefix, ""), 10);
    if (Number.isFinite(ultimoNumero)) nuevoNumero = ultimoNumero + 1;
  }

  const numeroFormateado = nuevoNumero.toString().padStart(4, "0");
  return `${prefix}${numeroFormateado}`;
};

/**
 * Genera código único para actividad
 * Formato: {CODIGO_PLAN}-ACT-XX
 */
const generarCodigoActividad = (codigoPlan, index) => {
  const numeroActividad = (index + 1).toString().padStart(2, "0");
  return `${codigoPlan}-ACT-${numeroActividad}`;
};

const crearPlan = async (data) => {
  const transaction = await sequelize.transaction();

  try {
    const { actividades = [], ...planDataRaw } = data || {};

    const planData = { ...planDataRaw };

    // =========================
    // NORMALIZAR
    // =========================
    planData.equipoObjetivoId = normalize(planData.equipoObjetivoId);
    planData.familiaId = normalize(planData.familiaId);
    planData.tipoEquipo = normalize(planData.tipoEquipo);
    planData.modeloEquipo = normalize(planData.modeloEquipo);
    planData.nombre = planData.nombre?.trim();

    // =========================
    // VALIDACIONES BASE
    // =========================
    if (!planData.nombre) {
      throw new Error("El nombre del plan es obligatorio");
    }

    if (!planData.tipo) {
      throw new Error("El tipo de plan es obligatorio");
    }

    // Alcance mínimo
    if (!planData.familiaId && !planData.tipoEquipo && !planData.modeloEquipo) {
      throw new Error("Debe especificar al menos Familia, Tipo o Modelo para el plan");
    }

    // Actividades obligatorias
    if (!Array.isArray(actividades) || actividades.length === 0) {
      throw new Error("El plan de mantenimiento debe tener al menos una actividad");
    }

    // Plan específico / libre
    if (planData.esEspecifico && !planData.equipoObjetivoId) {
      throw new Error("Si el plan es específico debe indicar equipoObjetivoId");
    }

    if (!planData.esEspecifico && planData.equipoObjetivoId) {
      throw new Error("Un plan libre no debe tener equipoObjetivoId");
    }

    // =========================
    // CREAR PLAN
    // =========================
    const codigoPlan = await generarCodigoPlan();

    const plan = await PlanMantenimiento.create(
      {
        ...planData,
        codigoPlan,
      },
      { transaction }
    );

    // =========================
    // AUTO-VINCULAR SI ES ESPECÍFICO
    // =========================
    if (planData.esEspecifico && planData.equipoObjetivoId) {
      await EquipoPlanMantenimiento.create(
        {
          equipoId: planData.equipoObjetivoId,
          planMantenimientoId: plan.id,
        },
        { transaction }
      );
    }

    // =========================
    // CREAR ACTIVIDADES + ITEMS + ADJUNTOS
    // =========================
    for (const [index, actividad] of actividades.entries()) {
      const {
        items = [],
        adjuntos = [],
        frecuencia,
        frecuenciaHoras,
        ...actividadDataRaw
      } = actividad || {};

      const actividadData = { ...actividadDataRaw };

      if (!actividadData.tarea) {
        throw new Error(`Actividad ${index + 1}: tarea obligatoria`);
      }

      if (!actividadData.tipoTrabajo) {
        throw new Error(`Actividad ${index + 1}: tipoTrabajo obligatorio`);
      }

      if (!actividadData.rolTecnico) {
        throw new Error(`Actividad ${index + 1}: rolTecnico obligatorio`);
      }

      if (!frecuencia) {
        throw new Error(`Actividad ${index + 1}: frecuencia obligatoria`);
      }

      if (frecuencia === "POR_HORA" && (!frecuenciaHoras || Number(frecuenciaHoras) <= 0)) {
        throw new Error(`Actividad ${index + 1}: Frecuencia POR_HORA requiere frecuenciaHoras > 0`);
      }

      const codigoActividad = generarCodigoActividad(codigoPlan, index);

      const nuevaActividad = await PlanMantenimientoActividad.create(
        {
          ...actividadData,
          codigoActividad,
          frecuencia,
          frecuenciaHoras: frecuencia === "POR_HORA" ? frecuenciaHoras : null,
          planMantenimientoId: plan.id,
        },
        { transaction }
      );

      // ITEMS
      if (Array.isArray(items) && items.length > 0) {
        await PlanActividadItem.bulkCreate(
          items.map((it, idx) => {
            if (!it?.recurso) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: recurso obligatorio`);
            if (!it?.item) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: item obligatorio`);
            if (!it?.itemCode) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: itemCode obligatorio`);
            if (!it?.unidad) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: unidad obligatoria`);

            const cantidad = Number(it.cantidad);
            if (!Number.isFinite(cantidad) || cantidad <= 0) {
              throw new Error(`Actividad ${index + 1} Item ${idx + 1}: cantidad debe ser > 0`);
            }

            return {
              recurso: it.recurso,
              item: it.item,
              itemCode: it.itemCode,
              unidad: it.unidad,
              cantidad,
              observacion: it.observacion ?? null,
              actividadId: nuevaActividad.id,
            };
          }),
          { transaction }
        );
      }

      // ADJUNTOS
      if (Array.isArray(adjuntos) && adjuntos.length > 0) {
        await Adjunto.bulkCreate(
          adjuntos.map((a) => ({
            ...a,
            planMantenimientoActividadId: nuevaActividad.id,
          })),
          { transaction }
        );
      }
    }

    await transaction.commit();

    // =========================
    // RETORNAR COMPLETO
    // =========================
    return await PlanMantenimiento.findByPk(plan.id, {
      include: [
        {
          association: "actividades",
          include: [{ association: "items" }, { association: "adjuntos" }],
        },
        { association: "familia" },
        {
          association: "equipos",
          attributes: ["id", "nombre", "codigo"],
          through: { attributes: [] },
        },
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const obtenerPlanes = async () => {
  return await PlanMantenimiento.findAll({
    where: { activo: true },
    include: [
      {
        association: "actividades",
        include: [{ association: "items" }, { association: "adjuntos" }],
      },
      {
        association: "equipos",
        attributes: ["id", "nombre", "codigo"],
        through: { attributes: [] },
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const obtenerPlanPorId = async (id) => {
  if (!id) throw new Error("El id es obligatorio");

  const plan = await PlanMantenimiento.findByPk(id, {
    include: [
      {
        association: "actividades",
        include: [{ association: "items" }, { association: "adjuntos" }],
      },
      {
        association: "equipos",
        attributes: ["id", "nombre", "codigo"],
        through: { attributes: [] },
      },
    ],
  });

  if (!plan) throw new Error("Plan no encontrado");
  return plan;
};

/**
 * Devuelve planes asociados a un equipo (COMPLETO)
 * Útil si quieres ver actividades/items en pantalla del tratamiento.
 * Si solo quieres listar en un select, conviene hacer una versión "light".
 */
const obtenerPlanesPorEquipo = async (equipoId) => {
  if (!equipoId) throw new Error("equipoId es obligatorio");

  const equipo = await Equipo.findByPk(equipoId, {
    include: [
      {
        association: "planesMantenimiento",
        where: { activo: true },
        required: false,
        through: { attributes: [] },
        include: [
          {
            association: "actividades",
            include: [{ association: "items" }, { association: "adjuntos" }],
          },
        ],
      },
    ],
  });

  if (!equipo) throw new Error("Equipo no encontrado");
  return equipo.planesMantenimiento || [];
};

const obtenerMejorPlanPorEquipo = async (equipoId) => {
  const planes = await obtenerPlanesPorEquipo(equipoId);
  if (!planes.length) return null;

  // si luego quieres ranking real, aquí lo pones
  return planes[0];
};

/**
 * Vincula (o reemplaza) planes de mantenimiento de un equipo.
 * Permite [] para limpiar vínculos.
 */
const actualizarPlanesDeEquipo = async (equipoId, planesMantenimientoIds) => {
  if (!equipoId) throw new Error("El id del equipo es obligatorio");

  if (!Array.isArray(planesMantenimientoIds)) {
    throw new Error("planesMantenimientoIds debe ser un arreglo");
  }

  const equipo = await Equipo.findByPk(equipoId);
  if (!equipo) throw new Error("Equipo no encontrado");

  const ids = [...new Set(planesMantenimientoIds.filter((x) => typeof x === "string" && x.trim()))];

  const planes = await PlanMantenimiento.findAll({
    where: { id: ids },
  });

  if (planes.length !== ids.length) {
    throw new Error("Uno o más planes no existen");
  }

  await sequelize.transaction(async (t) => {
    await equipo.setPlanesMantenimiento(ids, { transaction: t });
  });

  return await Equipo.findByPk(equipoId, {
    include: [
      {
        association: "planesMantenimiento",
        through: { attributes: [] },
        attributes: ["id", "codigoPlan", "nombre", "tipo", "activo"],
      },
    ],
  });
};

module.exports = {
  crearPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
  actualizarPlanesDeEquipo,
};