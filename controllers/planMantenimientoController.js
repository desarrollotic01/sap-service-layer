
 const {
  PlanMantenimiento,
  PlanMantenimientoActividad,
  PlanActividadItem,
  Adjunto,
  Equipo,
  Familia,
  EquipoPlanMantenimiento,
  sequelize,
} = require("../db_connection");

const { Op } = require("sequelize");


const generarCodigoPlan = async () => {
  const year = new Date().getFullYear();
  const prefix = `PLAN-${year}-`;

  // Buscar el último código del año actual
  const ultimoPlan = await PlanMantenimiento.findOne({
    where: {
      codigoPlan: {
        [require("sequelize").Op.like]: `${prefix}%`,
      },
    },
    order: [["codigoPlan", "DESC"]],
  });

  let nuevoNumero = 1;

  if (ultimoPlan) {
    
    const ultimoNumero = parseInt(
      ultimoPlan.codigoPlan.replace(prefix, ""),
      10
    );
    nuevoNumero = ultimoNumero + 1;
  }

  
  const numeroFormateado = nuevoNumero.toString().padStart(4, "0");

  return `${prefix}${numeroFormateado}`;
};

/**
 * Genera código único para actividad
 * Formato: {CODIGO_PLAN}-ACT-XX
 * Ejemplo: PLAN-2024-0001-ACT-01
 */
const generarCodigoActividad = (codigoPlan, index) => {
  const numeroActividad = (index + 1).toString().padStart(2, "0");
  return `${codigoPlan}-ACT-${numeroActividad}`;
};

const normalize = (v) => (v === "" || v === undefined ? null : v);

const crearPlan = async (data) => {
  const transaction = await sequelize.transaction();

  try {
    const { actividades = [], ...planData } = data;

    // ========================================
    // 🔥 NORMALIZAR VALORES VACÍOS (CRÍTICO)
    // ========================================
    planData.equipoId = normalize(planData.equipoId);
    planData.familiaId = normalize(planData.familiaId);
    planData.tipoEquipo = normalize(planData.tipoEquipo);
    planData.modeloEquipo = normalize(planData.modeloEquipo);
    planData.nombre = planData.nombre?.trim();


    if (planData.equipoId) {
  throw new Error(
    "Los planes no deben asignarse directamente a un equipo. Use la vinculación de equipos."
  );
}

    // ========================================
    // 🔥 VALIDACIÓN DE ALCANCE
    if (
  !planData.familiaId &&
  !planData.tipoEquipo &&
  !planData.modeloEquipo
) {
  throw new Error(
    "Debe especificar al menos Familia, Tipo o Modelo para el plan"
  );
}


if (!actividades.length) {
  throw new Error(
    "El plan de mantenimiento debe tener al menos una actividad"
  );
}


// ========================================
// 🔥 VALIDACIÓN PLAN ESPECÍFICO
// ========================================
if (planData.esEspecifico && !planData.equipoObjetivoId) {
  throw new Error(
    "Si el plan es específico debe indicar equipoObjetivoId"
  );
}

if (!planData.esEspecifico && planData.equipoObjetivoId) {
  throw new Error(
    "Un plan libre no debe tener equipoObjetivoId"
  );
}




  

    // ========================================
    // 🔥 GENERAR CÓDIGO PLAN
    // ========================================
    const codigoPlan = await generarCodigoPlan();

    // ========================================
    // 🔥 CREAR PLAN
    // ========================================
    const plan = await PlanMantenimiento.create(
      {
        ...planData,
        codigoPlan,
      },
      { transaction }
    );

    // ========================================
// 🔥 AUTO-VINCULAR SI ES ESPECÍFICO
// ========================================
if (planData.esEspecifico && planData.equipoObjetivoId) {
  await EquipoPlanMantenimiento.create(
    {
      equipoId: planData.equipoObjetivoId,
      planMantenimientoId: plan.id,
    },
    { transaction }
  );
}


    // ========================================
    // 🔥 CREAR ACTIVIDADES
    // ========================================
    for (const [index, actividad] of actividades.entries()) {
      const {
        items = [],
        adjuntos = [],
        frecuencia,
        frecuenciaHoras,
        ...actividadData
      } = actividad;

      // Validación frecuencia
      if (frecuencia === "POR_HORA" && !frecuenciaHoras) {
        throw new Error(
          `Actividad ${index + 1}: Frecuencia POR_HORA requiere especificar horas`
        );
      }

      const codigoActividad = generarCodigoActividad(codigoPlan, index);

      const nuevaActividad = await PlanMantenimientoActividad.create(
        {
          ...actividadData,
          codigoActividad,
          frecuencia,
          frecuenciaHoras:
            frecuencia === "POR_HORA" ? frecuenciaHoras : null,
          planMantenimientoId: plan.id,
        },
        { transaction }
      );

      // ========================================
      // 🔥 ITEMS
      // ========================================
      if (items.length > 0) {
        await PlanActividadItem.bulkCreate(
          items.map((item) => ({
            ...item,
            actividadId: nuevaActividad.id,
          })),
          { transaction }
        );
      }

      // ========================================
      // 🔥 ADJUNTOS
      // ========================================
      if (adjuntos.length > 0) {
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

    // ========================================
    // 🔥 RETORNAR COMPLETO
    // ========================================
    return await PlanMantenimiento.findByPk(plan.id, {
      include: [
        {
          association: "actividades",
          include: [
            { association: "items" },
            { association: "adjuntos" },
          ],
        },
        { association: "familia" },

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
        include: [
          { association: "items" },
          { association: "adjuntos" },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};



const obtenerPlanPorId = async (id) => {
  return await PlanMantenimiento.findByPk(id, {
    include: [
      {
        association: "actividades",
        include: [
          { association: "items" },
          { association: "adjuntos" },
        ],
      },
    ],
  });
};


const obtenerPlanesPorEquipo = async (equipoId) => {
  const equipo = await Equipo.findByPk(equipoId, {
    include: [
      {
        association: "planesMantenimiento",
        where: { activo: true },
        required: false,
        include: [
          {
            association: "actividades",
            include: [
              { association: "items" },
              { association: "adjuntos" },
            ],
          },
        ],
      },
    ],
  });

  if (!equipo) {
    throw new Error("Equipo no encontrado");
  }

  return equipo.planesMantenimiento;
};


const obtenerMejorPlanPorEquipo = async (equipoId) => {
  const planes = await obtenerPlanesPorEquipo(equipoId);
  if (!planes.length) return null;
  return planes[0];
};


module.exports = {
  crearPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
};
