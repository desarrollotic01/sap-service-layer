/**
 * controllers/planMantenimientoController.js
 * ✅ COMPLETO: Plan + Actividades + Items por actividad + Items generales del plan + Adjuntos (plan y actividad)
 */

const {
  PlanMantenimiento,
  PlanMantenimientoActividad,
  PlanActividadItem,
  PlanMantenimientoItem,
  Adjunto,
  Equipo,
  EquipoPlanMantenimiento,
  sequelize,
} = require("../db_connection");

const { Op } = require("sequelize");

const normalize = (v) => (v === "" || v === undefined ? null : v);

/* =========================================================
   ✅ HELPERS DE DURACIÓN
========================================================= */

const toMinutos = (valor, unidad) => {
  if (valor === null || valor === undefined || valor === "") return null;

  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return null;

  return unidad === "h" ? Math.round(v * 60) : Math.round(v);
};

const toValorEditable = (min, unidad) => {
  const m = Number(min);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return unidad === "h" ? m / 60 : m;
};

const withDuracionValor = (plan) => {
  if (!plan) return plan;

  const json = plan.toJSON ? plan.toJSON() : plan;

  if (Array.isArray(json.actividades)) {
    json.actividades = json.actividades.map((a) => {
      const unidad = a.unidadDuracion || "min";
      return {
        ...a,
        duracionValor: toValorEditable(a.duracionMinutos, unidad),
      };
    });
  }

  return json;
};

/* =========================================================
   CÓDIGOS
========================================================= */

/**
 * Genera código único para plan
 * Formato: PLAN-YYYY-0001
 */
const generarCodigoPlan = async () => {
  const year = new Date().getFullYear();
  const prefix = `PLAN-${year}-`;

  const ultimoPlan = await PlanMantenimiento.findOne({
    where: { codigoPlan: { [Op.like]: `${prefix}%` } },
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

/* =========================================================
   VALIDADORES AUXILIARES
========================================================= */

const validarAdjuntoBasico = (a, label) => {
  const nombre = a?.nombre ?? a?.nombreArchivo ?? null;
  if (!nombre) throw new Error(`${label}: nombre obligatorio`);
  if (!a?.url) throw new Error(`${label}: url obligatoria`);

  // categoria opcional, pero si viene, que sea string (y tu ENUM lo validará en BD)
  return {
    ...a,
    nombre,
    categoria: a.categoria ?? "OTRO",
  };
};

/* =========================================================
   CREAR PLAN
   - ✅ frecuencia en PLAN (no por actividad)
   - ✅ items generales del plan (PlanMantenimientoItem)
   - ✅ items por actividad (PlanActividadItem)
   - ✅ adjuntos generales del plan (Adjunto.planMantenimientoId)
   - ✅ adjuntos por actividad (Adjunto.planMantenimientoActividadId)
========================================================= */

const crearPlan = async (data) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      actividades = [],
      itemsPlan = [], // items generales tipo solicitud
      adjuntosPlan = [], // adjuntos generales del plan
      ...planDataRaw
    } = data || {};

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
    if (!planData.nombre) throw new Error("El nombre del plan es obligatorio");
    if (!planData.tipo) throw new Error("El tipo de plan es obligatorio");

    if (!planData.frecuencia) throw new Error("La frecuencia del plan es obligatoria");

    if (
      planData.frecuencia === "POR_HORA" &&
      (!planData.frecuenciaHoras || Number(planData.frecuenciaHoras) <= 0)
    ) {
      throw new Error("Frecuencia POR_HORA requiere frecuenciaHoras > 0");
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
        frecuenciaHoras: planData.frecuencia === "POR_HORA" ? planData.frecuenciaHoras : null,
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
    // ✅ ITEMS GENERALES DEL PLAN (tipo solicitud)
    // =========================
    if (Array.isArray(itemsPlan) && itemsPlan.length > 0) {
      await PlanMantenimientoItem.bulkCreate(
        itemsPlan.map((it, idx) => {
          if (!it?.itemCode) throw new Error(`ItemPlan ${idx + 1}: itemCode obligatorio`);

          const quantity = Number(it.quantity ?? it.cantidad);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`ItemPlan ${idx + 1}: quantity debe ser > 0`);
          }

          const warehouseCode = (it.warehouseCode || it.almacen || "01").toString().trim();
          if (!warehouseCode) throw new Error(`ItemPlan ${idx + 1}: warehouseCode obligatorio`);

          return {
            planMantenimientoId: plan.id,
            itemCode: String(it.itemCode).trim(),
            description: it.description ?? it.item ?? null,
            quantity,
            warehouseCode,
            costingCode: it.costingCode ?? it.costCenter ?? null,
            projectCode: it.projectCode ?? null,
            rubro: it.rubro ?? null,
            paqueteTrabajo: it.paqueteTrabajo ?? null,
            observacion: it.observacion ?? null,
          };
        }),
        { transaction }
      );
    }

    // =========================
    // ✅ ADJUNTOS GENERALES DEL PLAN
    // (mapea nombreArchivo -> nombre y setea categoria por defecto)
    // =========================
    if (Array.isArray(adjuntosPlan) && adjuntosPlan.length > 0) {
      await Adjunto.bulkCreate(
        adjuntosPlan.map((a, i) => {
          const adj = validarAdjuntoBasico(a, `AdjuntoPlan ${i + 1}`);
          return {
            ...adj,
            planMantenimientoId: plan.id,
          };
        }),
        { transaction }
      );
    }

    // =========================
    // ✅ ACTIVIDADES + ITEMS (por actividad) + ADJUNTOS (por actividad)
    // =========================
    for (const [index, actividad] of actividades.entries()) {
      const { items = [], adjuntos = [], ...actividadDataRaw } = actividad || {};
      const actividadData = { ...actividadDataRaw };

      actividadData.sistema = normalize(actividadData.sistema);
      actividadData.subsistema = normalize(actividadData.subsistema);
      actividadData.componente = normalize(actividadData.componente);
      actividadData.tarea = actividadData.tarea?.trim();

      if (!actividadData.tarea) throw new Error(`Actividad ${index + 1}: tarea obligatoria`);
      if (!actividadData.tipoTrabajo) throw new Error(`Actividad ${index + 1}: tipoTrabajo obligatorio`);
      if (!actividadData.rolTecnico) throw new Error(`Actividad ${index + 1}: rolTecnico obligatorio`);

      const codigoActividad = generarCodigoActividad(codigoPlan, index);

      const unidad = actividadData.unidadDuracion || "min";
      const valorIngresado =
        actividad.duracionValor !== undefined
          ? actividad.duracionValor
          : actividadData.duracionValor !== undefined
          ? actividadData.duracionValor
          : actividadData.duracionMinutos; // legacy

      const duracionMinutosReal = toMinutos(valorIngresado, unidad);
      if (duracionMinutosReal === null) throw new Error(`Actividad ${index + 1}: duración inválida`);

      const cantTec = Number(actividadData.cantidadTecnicos);
      if (!Number.isFinite(cantTec) || cantTec <= 0) {
        throw new Error(`Actividad ${index + 1}: cantidadTecnicos debe ser > 0`);
      }

      const nuevaActividad = await PlanMantenimientoActividad.create(
        {
          ...actividadData,
          codigoActividad,
          planMantenimientoId: plan.id,
          duracionMinutos: duracionMinutosReal,
          unidadDuracion: unidad,
          cantidadTecnicos: cantTec,
        },
        { transaction }
      );

      // ✅ ITEMS POR ACTIVIDAD
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
              actividadId: nuevaActividad.id, // ✅ FK correcta
            };
          }),
          { transaction }
        );
      }

      // ✅ ADJUNTOS POR ACTIVIDAD
      if (Array.isArray(adjuntos) && adjuntos.length > 0) {
        await Adjunto.bulkCreate(
          adjuntos.map((a, i) => {
            const adj = validarAdjuntoBasico(a, `Actividad ${index + 1} Adjunto ${i + 1}`);
            return {
              ...adj,
              planMantenimientoActividadId: nuevaActividad.id,
            };
          }),
          { transaction }
        );
      }
    }

    await transaction.commit();

    // =========================
    // RETORNAR COMPLETO + duracionValor
    // =========================
    const planCompleto = await PlanMantenimiento.findByPk(plan.id, {
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
        { association: "items" }, // items generales del plan
        { association: "adjuntos" }, // adjuntos generales del plan
      ],
    });

    return withDuracionValor(planCompleto);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/* =========================================================
   OBTENER PLANES
========================================================= */

const obtenerPlanes = async () => {
  const planes = await PlanMantenimiento.findAll({
    where: { activo: true },
    include: [
      {
        association: "actividades",
        include: [{ association: "items" }, { association: "adjuntos" }],
      },
      { association: "items" },
      { association: "adjuntos" },
      {
        association: "equipos",
        attributes: ["id", "nombre", "codigo"],
        through: { attributes: [] },
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return planes.map(withDuracionValor);
};

/* =========================================================
   OBTENER PLAN POR ID
========================================================= */

const obtenerPlanPorId = async (id) => {
  if (!id) throw new Error("El id es obligatorio");

  const plan = await PlanMantenimiento.findByPk(id, {
    include: [
      {
        association: "actividades",
        include: [{ association: "items" }, { association: "adjuntos" }],
      },
      { association: "items" },
      { association: "adjuntos" },
      {
        association: "equipos",
        attributes: ["id", "nombre", "codigo"],
        through: { attributes: [] },
      },
    ],
  });

  if (!plan) throw new Error("Plan no encontrado");
  return withDuracionValor(plan);
};

/* =========================================================
   OBTENER PLANES POR EQUIPO
========================================================= */

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
          { association: "items" },
          { association: "adjuntos" },
        ],
      },
    ],
  });

  if (!equipo) throw new Error("Equipo no encontrado");

  const planes = equipo.planesMantenimiento || [];
  return planes.map(withDuracionValor);
};

const obtenerMejorPlanPorEquipo = async (equipoId) => {
  const planes = await obtenerPlanesPorEquipo(equipoId);
  if (!planes.length) return null;
  return planes[0];
};

/* =========================================================
   ACTUALIZAR PLANES DE EQUIPO (setPlanesMantenimiento)
========================================================= */

const actualizarPlanesDeEquipo = async (equipoId, planesMantenimientoIds) => {
  if (!equipoId) throw new Error("El id del equipo es obligatorio");
  if (!Array.isArray(planesMantenimientoIds)) throw new Error("planesMantenimientoIds debe ser un arreglo");

  const equipo = await Equipo.findByPk(equipoId);
  if (!equipo) throw new Error("Equipo no encontrado");

  const ids = [...new Set(planesMantenimientoIds.filter((x) => typeof x === "string" && x.trim()))];

  const planes = await PlanMantenimiento.findAll({ where: { id: ids } });
  if (planes.length !== ids.length) throw new Error("Uno o más planes no existen");

  await sequelize.transaction(async (t) => {
    await equipo.setPlanesMantenimiento(ids, { transaction: t });
  });

  return await Equipo.findByPk(equipoId, {
    include: [
      {
        association: "planesMantenimiento",
        through: { attributes: [] },
        attributes: ["id", "codigoPlan", "nombre", "tipo", "activo", "frecuencia", "frecuenciaHoras"],
      },
    ],
  });
};

/* =========================================================
   CAMBIAR ESTADO PLAN (toggle o set)
========================================================= */

const cambiarEstadoPlan = async ({ id, activo }) => {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new Error("El id del plan es obligatorio");
  }

  if (activo !== undefined && typeof activo !== "boolean") {
    throw new Error("El campo activo debe ser boolean (true/false)");
  }

  return await sequelize.transaction(async (t) => {
    const plan = await PlanMantenimiento.findByPk(id, { transaction: t });
    if (!plan) throw new Error("Plan no encontrado");

    const nuevoEstado = activo === undefined ? !plan.activo : activo;

    await plan.update({ activo: nuevoEstado }, { transaction: t });

    const planActualizado = await PlanMantenimiento.findByPk(id, {
      transaction: t,
      include: [
        { association: "familia" },
        {
          association: "actividades",
          include: [{ association: "items" }, { association: "adjuntos" }],
        },
        { association: "items" },
        { association: "adjuntos" },
        {
          association: "equipos",
          attributes: ["id", "nombre", "codigo"],
          through: { attributes: [] },
        },
      ],
    });

    return planActualizado;
  });
};

module.exports = {
  crearPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
  actualizarPlanesDeEquipo,
  cambiarEstadoPlan,
};