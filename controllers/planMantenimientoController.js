const {
  PlanMantenimiento,
  PlanMantenimientoActividad,
  PlanActividadItem,
  PlanMantenimientoItem,
  Adjunto,
  Equipo,
  EquipoPlanMantenimiento,
  UbicacionTecnica,
  UbicacionTecnicaPlanMantenimiento,
  sequelize,
} = require("../db_connection");

const { Op } = require("sequelize");

const normalize = (v) => {
  if (v === "" || v === undefined || v === "null" || v === "undefined") return null;
  return v;
};

const parseJSON = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
};

/* =========================================================
   HELPERS DE DURACIÓN
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
        duracionEstimadaValor: toValorEditable(a.duracionMinutos, unidad),
      };
    });
  }

  return json;
};

/* =========================================================
   CÓDIGOS
========================================================= */

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

  return `${prefix}${String(nuevoNumero).padStart(4, "0")}`;
};

const generarCodigoActividad = (codigoPlan, index) => {
  const numeroActividad = (index + 1).toString().padStart(2, "0");
  return `${codigoPlan}-ACT-${numeroActividad}`;
};

/* =========================================================
   INCLUDE BASE
========================================================= */

const includePlanCompleto = [
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
  {
    association: "ubicacionesTecnicas",
    attributes: ["id", "codigo", "nombre"],
    through: { attributes: [] },
  },
  {
    association: "equipoObjetivo",
    attributes: ["id", "nombre", "codigo"],
  },
  {
    association: "ubicacionTecnicaObjetivo",
    attributes: ["id", "codigo", "nombre"],
  },
  { association: "items" },
  { association: "adjuntos" },
];

/* =========================================================
   CREAR PLAN
   - soporta EQUIPO y UBICACION_TECNICA
   - soporta adjuntos del plan y de actividades
   - adjuntos se reciben en req.files
========================================================= */

const crearPlan = async (data, files = []) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      actividades: actividadesRaw = [],
      itemsPlan: itemsPlanRaw = [],
      equiposIds: equiposIdsRaw = [],
      ubicacionesTecnicasIds: ubicacionesTecnicasIdsRaw = [],
      ...planDataRaw
    } = data || {};

    const actividades = parseJSON(actividadesRaw, []);
    const itemsPlan = parseJSON(itemsPlanRaw, []);
    const equiposIds = parseJSON(equiposIdsRaw, []);
    const ubicacionesTecnicasIds = parseJSON(ubicacionesTecnicasIdsRaw, []);

    const planData = { ...planDataRaw };

    // =========================
    // NORMALIZAR
    // =========================
    planData.nombre = planData.nombre?.trim();
    planData.contextoObjetivo = normalize(planData.contextoObjetivo);
    planData.tipo = normalize(planData.tipo);
    planData.frecuencia = normalize(planData.frecuencia);

    planData.familiaId = normalize(planData.familiaId);
    planData.tipoEquipo = normalize(planData.tipoEquipo);
    planData.modeloEquipo = normalize(planData.modeloEquipo);

    planData.equipoObjetivoId = normalize(planData.equipoObjetivoId);
    planData.ubicacionTecnicaObjetivoId = normalize(planData.ubicacionTecnicaObjetivoId);

    planData.frecuenciaHoras = normalize(planData.frecuenciaHoras);
    planData.esEspecifico =
      planData.esEspecifico === true || planData.esEspecifico === "true";

    // =========================
    // VALIDACIONES BASE
    // =========================
    if (!planData.nombre) throw new Error("El nombre del plan es obligatorio");
    if (!planData.contextoObjetivo) throw new Error("El contextoObjetivo es obligatorio");
    if (!planData.tipo) throw new Error("El tipo de plan es obligatorio");
    if (!planData.frecuencia) throw new Error("La frecuencia del plan es obligatoria");

    if (
      planData.frecuencia === "POR_HORA" &&
      (!planData.frecuenciaHoras || Number(planData.frecuenciaHoras) <= 0)
    ) {
      throw new Error("Frecuencia POR_HORA requiere frecuenciaHoras > 0");
    }

    if (!Array.isArray(actividades) || actividades.length === 0) {
      throw new Error("El plan de mantenimiento debe tener al menos una actividad");
    }

    // =========================
    // REGLAS POR CONTEXTO
    // =========================
    if (planData.contextoObjetivo === "EQUIPO") {
      if (!planData.familiaId && !planData.tipoEquipo && !planData.modeloEquipo) {
        throw new Error(
          "Para planes de EQUIPO debe especificar al menos Familia, Tipo o Modelo"
        );
      }

      if (planData.esEspecifico && !planData.equipoObjetivoId) {
        throw new Error("Si el plan es específico para EQUIPO debe indicar equipoObjetivoId");
      }

      if (!planData.esEspecifico && planData.equipoObjetivoId) {
        throw new Error("Un plan libre de EQUIPO no debe tener equipoObjetivoId");
      }

      planData.ubicacionTecnicaObjetivoId = null;
    }

    if (planData.contextoObjetivo === "UBICACION_TECNICA") {
      // estos campos no aplican
      planData.familiaId = null;
      planData.tipoEquipo = null;
      planData.modeloEquipo = null;
      planData.equipoObjetivoId = null;

      if (planData.esEspecifico && !planData.ubicacionTecnicaObjetivoId) {
        throw new Error(
          "Si el plan es específico para UBICACION_TECNICA debe indicar ubicacionTecnicaObjetivoId"
        );
      }

      if (!planData.esEspecifico && planData.ubicacionTecnicaObjetivoId) {
        throw new Error(
          "Un plan libre de UBICACION_TECNICA no debe tener ubicacionTecnicaObjetivoId"
        );
      }
    }

    // =========================
    // CREAR PLAN
    // =========================
    const codigoPlan = await generarCodigoPlan();

    const plan = await PlanMantenimiento.create(
      {
        ...planData,
        codigoPlan,
        frecuenciaHoras:
          planData.frecuencia === "POR_HORA"
            ? Number(planData.frecuenciaHoras)
            : null,
      },
      { transaction }
    );

    // =========================
    // AUTO-VINCULAR SI ES ESPECÍFICO
    // =========================
    if (
      planData.contextoObjetivo === "EQUIPO" &&
      planData.esEspecifico &&
      planData.equipoObjetivoId
    ) {
      await EquipoPlanMantenimiento.create(
        {
          equipoId: planData.equipoObjetivoId,
          planMantenimientoId: plan.id,
        },
        { transaction }
      );
    }

    if (
      planData.contextoObjetivo === "UBICACION_TECNICA" &&
      planData.esEspecifico &&
      planData.ubicacionTecnicaObjetivoId
    ) {
      await UbicacionTecnicaPlanMantenimiento.create(
        {
          ubicacionTecnicaId: planData.ubicacionTecnicaObjetivoId,
          planMantenimientoId: plan.id,
        },
        { transaction }
      );
    }

    // =========================
    // ASIGNACIONES MANY TO MANY
    // =========================
    if (
      planData.contextoObjetivo === "EQUIPO" &&
      Array.isArray(equiposIds) &&
      equiposIds.length > 0
    ) {
      await plan.setEquipos(equiposIds, { transaction });
    }

    if (
      planData.contextoObjetivo === "UBICACION_TECNICA" &&
      Array.isArray(ubicacionesTecnicasIds) &&
      ubicacionesTecnicasIds.length > 0
    ) {
      await plan.setUbicacionesTecnicas(ubicacionesTecnicasIds, { transaction });
    }

    // =========================
    // ITEMS GENERALES DEL PLAN
    // =========================
    if (Array.isArray(itemsPlan) && itemsPlan.length > 0) {
  await PlanMantenimientoItem.bulkCreate(
    itemsPlan.map((it, idx) => {
      if (!it?.itemCode || !String(it.itemCode).trim()) {
        throw new Error(`ItemPlan ${idx + 1}: itemCode obligatorio`);
      }

      const quantity = Number(it.quantity ?? it.cantidad);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`ItemPlan ${idx + 1}: quantity debe ser > 0`);
      }

      const warehouseCode = String(it.warehouseCode || it.almacen || "01").trim();
      if (!warehouseCode) {
        throw new Error(`ItemPlan ${idx + 1}: warehouseCode obligatorio`);
      }

      return {
        planMantenimientoId: plan.id,
        itemId: normalize(it.itemId),
        itemCode: String(it.itemCode).trim(),
        description: normalize(it.description ?? it.item ?? null),
        quantity,
        warehouseCode,
        costingCode: normalize(it.costingCode ?? it.costCenter ?? null),
        projectCode: normalize(it.projectCode ?? null),
        rubroSapCode:
          it.rubroSapCode !== undefined &&
          it.rubroSapCode !== null &&
          it.rubroSapCode !== ""
            ? Number(it.rubroSapCode)
            : null,
        paqueteTrabajo: normalize(it.paqueteTrabajo ?? null),
        observacion: normalize(it.observacion ?? null),
      };
    }),
    { transaction }
  );
}

    // =========================
    // ADJUNTOS DEL PLAN (archivos)
    // key esperada: adjuntosPlan
    // =========================
    const adjuntosPlanFiles = files.filter(
      (file) => file.fieldname === "adjuntosPlan"
    );

    if (adjuntosPlanFiles.length > 0) {
      await Adjunto.bulkCreate(
        adjuntosPlanFiles.map((file) => ({
          nombre: file.originalname,
          url: `/uploads/planes/${file.filename}`,
          extension: file.mimetype,
          categoria: "OTRO",
          planMantenimientoId: plan.id,
        })),
        { transaction }
      );
    }

    // =========================
    // ACTIVIDADES + ITEMS + ADJUNTOS
    // =========================
    for (const [index, actividad] of actividades.entries()) {
      const { items = [], ...actividadDataRaw } = actividad || {};
      const actividadData = { ...actividadDataRaw };

      actividadData.sistema = normalize(actividadData.sistema);
      actividadData.subsistema = normalize(actividadData.subsistema);
      actividadData.componente = normalize(actividadData.componente);
      actividadData.tarea = actividadData.tarea?.trim();

      if (!actividadData.tarea) {
        throw new Error(`Actividad ${index + 1}: tarea obligatoria`);
      }

      if (!actividadData.tipoTrabajo) {
        throw new Error(`Actividad ${index + 1}: tipoTrabajo obligatorio`);
      }


      const codigoActividad = generarCodigoActividad(codigoPlan, index);

      const unidad = actividadData.unidadDuracion || "min";
      const valorIngresado =
        actividad.duracionValor !== undefined
          ? actividad.duracionValor
          : actividadData.duracionValor !== undefined
          ? actividadData.duracionValor
          : actividadData.duracionMinutos;

      const duracionMinutosReal = toMinutos(valorIngresado, unidad);
      if (duracionMinutosReal === null) {
        throw new Error(`Actividad ${index + 1}: duración inválida`);
      }

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
          orden: actividadData.orden ?? index + 1,
        },
        { transaction }
      );

      // ITEMS POR ACTIVIDAD
      if (Array.isArray(items) && items.length > 0) {
  await PlanActividadItem.bulkCreate(
    items.map((it, idx) => {
      if (!it?.itemCode || !String(it.itemCode).trim()) {
        throw new Error(
          `Actividad ${index + 1} Item ${idx + 1}: itemCode obligatorio`
        );
      }

      const quantity = Number(it.quantity ?? it.cantidad);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(
          `Actividad ${index + 1} Item ${idx + 1}: quantity debe ser > 0`
        );
      }

      const warehouseCode = String(it.warehouseCode || it.almacen || "01").trim();
      if (!warehouseCode) {
        throw new Error(
          `Actividad ${index + 1} Item ${idx + 1}: warehouseCode obligatorio`
        );
      }

      const rubroSapCode =
        it.rubroSapCode !== undefined &&
        it.rubroSapCode !== null &&
        it.rubroSapCode !== ""
          ? Number(it.rubroSapCode)
          : null;

      if (
        rubroSapCode !== null &&
        (!Number.isFinite(rubroSapCode) || Number.isNaN(rubroSapCode))
      ) {
        throw new Error(
          `Actividad ${index + 1} Item ${idx + 1}: rubroSapCode inválido`
        );
      }

      return {
        actividadId: nuevaActividad.id,
        itemId: normalize(it.itemId),
        itemCode: String(it.itemCode).trim(),
        description: normalize(it.description ?? it.item ?? null),
        quantity,
        warehouseCode,
        costingCode: normalize(it.costingCode ?? it.costCenter ?? null),
        projectCode: normalize(it.projectCode ?? null),
        rubroSapCode,
        paqueteTrabajo: normalize(it.paqueteTrabajo ?? null),
        observacion: normalize(it.observacion ?? null),
      };
    }),
    { transaction }
  );
}

      // ADJUNTOS DE ACTIVIDAD (archivos)
      // key esperada: adjuntosActividad_0, adjuntosActividad_1, etc.
      const adjuntosActividadFiles = files.filter(
        (file) => file.fieldname === `adjuntosActividad_${index}`
      );

      if (adjuntosActividadFiles.length > 0) {
        await Adjunto.bulkCreate(
          adjuntosActividadFiles.map((file) => ({
            nombre: file.originalname,
            url: `/uploads/planes/${file.filename}`,
            extension: file.mimetype,
            categoria: "OTRO",
            planMantenimientoActividadId: nuevaActividad.id,
          })),
          { transaction }
        );
      }
    }

    await transaction.commit();

    const planCompleto = await PlanMantenimiento.findByPk(plan.id, {
      include: includePlanCompleto,
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
    include: includePlanCompleto,
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
    include: includePlanCompleto,
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
        include: includePlanCompleto,
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
   ACTUALIZAR PLANES DE EQUIPO
========================================================= */

const actualizarPlanesDeEquipo = async (equipoId, planesMantenimientoIds) => {
  if (!equipoId) throw new Error("El id del equipo es obligatorio");
  if (!Array.isArray(planesMantenimientoIds)) {
    throw new Error("planesMantenimientoIds debe ser un arreglo");
  }

  const equipo = await Equipo.findByPk(equipoId);
  if (!equipo) throw new Error("Equipo no encontrado");

  const ids = [
    ...new Set(
      planesMantenimientoIds.filter((x) => typeof x === "string" && x.trim())
    ),
  ];

  const planes = await PlanMantenimiento.findAll({ where: { id: ids } });
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
        attributes: [
          "id",
          "codigoPlan",
          "nombre",
          "tipo",
          "activo",
          "frecuencia",
          "frecuenciaHoras",
          "contextoObjetivo",
        ],
      },
    ],
  });
};

/* =========================================================
   ACTUALIZAR PLAN COMPLETO
========================================================= */

const actualizarPlan = async (id, data, files = []) => {
  if (!id) throw new Error("El id es obligatorio");

  const plan = await PlanMantenimiento.findByPk(id);
  if (!plan) throw new Error("Plan no encontrado");

  const transaction = await sequelize.transaction();

  try {
    const {
      actividades: actividadesRaw = [],
      itemsPlan: itemsPlanRaw = [],
      equiposIds: equiposIdsRaw = [],
      ubicacionesTecnicasIds: ubicacionesTecnicasIdsRaw = [],
      ...planDataRaw
    } = data || {};

    const actividades = parseJSON(actividadesRaw, []);
    const itemsPlan = parseJSON(itemsPlanRaw, []);
    const equiposIds = parseJSON(equiposIdsRaw, []);
    const ubicacionesTecnicasIds = parseJSON(ubicacionesTecnicasIdsRaw, []);

    const planData = { ...planDataRaw };

    planData.nombre = planData.nombre?.trim();
    planData.contextoObjetivo = normalize(planData.contextoObjetivo);
    planData.tipo = normalize(planData.tipo);
    planData.frecuencia = normalize(planData.frecuencia);
    planData.familiaId = normalize(planData.familiaId);
    planData.tipoEquipo = normalize(planData.tipoEquipo);
    planData.modeloEquipo = normalize(planData.modeloEquipo);
    planData.equipoObjetivoId = normalize(planData.equipoObjetivoId);
    planData.ubicacionTecnicaObjetivoId = normalize(planData.ubicacionTecnicaObjetivoId);
    planData.frecuenciaHoras = normalize(planData.frecuenciaHoras);
    planData.esEspecifico = planData.esEspecifico === true || planData.esEspecifico === "true";

    if (!planData.nombre) throw new Error("El nombre del plan es obligatorio");
    if (!planData.contextoObjetivo) throw new Error("El contextoObjetivo es obligatorio");
    if (!planData.tipo) throw new Error("El tipo de plan es obligatorio");
    if (!planData.frecuencia) throw new Error("La frecuencia del plan es obligatoria");
    if (!Array.isArray(actividades) || actividades.length === 0) {
      throw new Error("El plan debe tener al menos una actividad");
    }

    // Actualizar campos del plan (NO regenerar codigoPlan)
    await plan.update(
      {
        nombre: planData.nombre,
        contextoObjetivo: planData.contextoObjetivo,
        tipo: planData.tipo,
        frecuencia: planData.frecuencia,
        frecuenciaHoras: planData.frecuencia === "POR_HORA" ? Number(planData.frecuenciaHoras) : null,
        familiaId: planData.contextoObjetivo === "EQUIPO" ? planData.familiaId : null,
        tipoEquipo: planData.contextoObjetivo === "EQUIPO" ? planData.tipoEquipo : null,
        modeloEquipo: planData.contextoObjetivo === "EQUIPO" ? planData.modeloEquipo : null,
        equipoObjetivoId: planData.contextoObjetivo === "EQUIPO" ? planData.equipoObjetivoId : null,
        ubicacionTecnicaObjetivoId: planData.contextoObjetivo === "UBICACION_TECNICA" ? planData.ubicacionTecnicaObjetivoId : null,
        esEspecifico: planData.esEspecifico,
      },
      { transaction }
    );

    // Reemplazar actividades: eliminar las antiguas y crear las nuevas
    const actividadesAntiguas = await PlanMantenimientoActividad.findAll({
      where: { planMantenimientoId: id },
      transaction,
    });
    const idsAntiguos = actividadesAntiguas.map((a) => a.id);

    if (idsAntiguos.length > 0) {
      await PlanActividadItem.destroy({ where: { actividadId: idsAntiguos }, transaction });
      await PlanMantenimientoActividad.destroy({ where: { planMantenimientoId: id }, transaction });
    }

    for (const [index, actividad] of actividades.entries()) {
      const { items = [], ...actividadDataRaw } = actividad || {};
      const actividadData = { ...actividadDataRaw };

      actividadData.sistema = normalize(actividadData.sistema);
      actividadData.subsistema = normalize(actividadData.subsistema);
      actividadData.componente = normalize(actividadData.componente);
      actividadData.tarea = actividadData.tarea?.trim();

      if (!actividadData.tarea) throw new Error(`Actividad ${index + 1}: tarea obligatoria`);
      if (!actividadData.tipoTrabajo) throw new Error(`Actividad ${index + 1}: tipoTrabajo obligatorio`);

      const codigoActividad = generarCodigoActividad(plan.codigoPlan, index);
      const unidad = actividadData.unidadDuracion || "min";
      const valorIngresado = actividad.duracionValor ?? actividadData.duracionMinutos;
      const duracionMinutosReal = toMinutos(valorIngresado, unidad);
      if (duracionMinutosReal === null) throw new Error(`Actividad ${index + 1}: duración inválida`);

      const cantTec = Number(actividadData.cantidadTecnicos);
      if (!Number.isFinite(cantTec) || cantTec <= 0) throw new Error(`Actividad ${index + 1}: cantidadTecnicos debe ser > 0`);

      const nuevaActividad = await PlanMantenimientoActividad.create(
        {
          ...actividadData,
          codigoActividad,
          planMantenimientoId: id,
          duracionMinutos: duracionMinutosReal,
          unidadDuracion: unidad,
          cantidadTecnicos: cantTec,
          orden: actividadData.orden ?? index + 1,
        },
        { transaction }
      );

      if (Array.isArray(items) && items.length > 0) {
        await PlanActividadItem.bulkCreate(
          items.map((it, idx) => {
            if (!it?.itemCode?.trim()) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: itemCode obligatorio`);
            const quantity = Number(it.quantity ?? it.cantidad);
            if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Actividad ${index + 1} Item ${idx + 1}: quantity debe ser > 0`);
            return {
              actividadId: nuevaActividad.id,
              itemId: normalize(it.itemId),
              itemCode: String(it.itemCode).trim(),
              description: normalize(it.description ?? it.item ?? null),
              quantity,
              warehouseCode: String(it.warehouseCode || "01").trim(),
              costingCode: normalize(it.costingCode ?? null),
              projectCode: normalize(it.projectCode ?? null),
              rubroSapCode: it.rubroSapCode ? Number(it.rubroSapCode) : null,
              paqueteTrabajo: normalize(it.paqueteTrabajo ?? null),
              observacion: normalize(it.observacion ?? null),
            };
          }),
          { transaction }
        );
      }
    }

    // Reemplazar ítems del plan
    await PlanMantenimientoItem.destroy({ where: { planMantenimientoId: id }, transaction });
    if (Array.isArray(itemsPlan) && itemsPlan.length > 0) {
      const itemsValidos = itemsPlan.filter((x) => (x.itemCode || "").trim());
      if (itemsValidos.length > 0) {
        await PlanMantenimientoItem.bulkCreate(
          itemsValidos.map((it) => ({
            planMantenimientoId: id,
            itemId: normalize(it.itemId),
            itemCode: String(it.itemCode).trim(),
            description: normalize(it.description ?? it.item ?? null),
            quantity: Number(it.quantity ?? it.cantidad) || 1,
            warehouseCode: String(it.warehouseCode || "01").trim(),
            rubroSapCode: it.rubroSapCode ? Number(it.rubroSapCode) : null,
            paqueteTrabajo: normalize(it.paqueteTrabajo ?? null),
            observacion: normalize(it.observacion ?? null),
          })),
          { transaction }
        );
      }
    }

    await transaction.commit();

    const planActualizado = await PlanMantenimiento.findByPk(id, { include: includePlanCompleto });
    return withDuracionValor(planActualizado);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/* =========================================================
   CAMBIAR ESTADO PLAN
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
      include: includePlanCompleto,
    });

    return planActualizado;
  });
};

/* =========================================================
   OBTENER PLANES POR UBICACION TECNICA
========================================================= */

const obtenerPlanesPorUbicacionTecnica = async (ubicacionTecnicaId) => {
  if (!ubicacionTecnicaId) throw new Error("ubicacionTecnicaId es obligatorio");

  const ubicacion = await UbicacionTecnica.findByPk(ubicacionTecnicaId, {
    include: [
      {
        association: "planesMantenimiento",
        where: { activo: true },
        required: false,
        through: { attributes: [] },
        include: includePlanCompleto,
      },
    ],
  });

  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  const planes = ubicacion.planesMantenimiento || [];
  return planes.map(withDuracionValor);
};

const obtenerMejorPlanPorUbicacionTecnica = async (ubicacionTecnicaId) => {
  const planes = await obtenerPlanesPorUbicacionTecnica(ubicacionTecnicaId);
  if (!planes.length) return null;
  return planes[0];
};

/* =========================================================
   ACTUALIZAR PLANES DE UBICACION TECNICA
========================================================= */

const actualizarPlanesDeUbicacionTecnica = async (
  ubicacionTecnicaId,
  planesMantenimientoIds
) => {
  if (!ubicacionTecnicaId) {
    throw new Error("El id de la ubicación técnica es obligatorio");
  }

  if (!Array.isArray(planesMantenimientoIds)) {
    throw new Error("planesMantenimientoIds debe ser un arreglo");
  }

  const ubicacion = await UbicacionTecnica.findByPk(ubicacionTecnicaId);
  if (!ubicacion) throw new Error("Ubicación técnica no encontrada");

  const ids = [
    ...new Set(
      planesMantenimientoIds.filter((x) => typeof x === "string" && x.trim())
    ),
  ];

  const planes = await PlanMantenimiento.findAll({ where: { id: ids } });
  if (planes.length !== ids.length) {
    throw new Error("Uno o más planes no existen");
  }

  await sequelize.transaction(async (t) => {
    await ubicacion.setPlanesMantenimiento(ids, { transaction: t });
  });

  return await UbicacionTecnica.findByPk(ubicacionTecnicaId, {
    include: [
      {
        association: "planesMantenimiento",
        through: { attributes: [] },
        attributes: [
          "id",
          "codigoPlan",
          "nombre",
          "tipo",
          "activo",
          "frecuencia",
          "frecuenciaHoras",
          "contextoObjetivo",
        ],
      },
    ],
  });
};

module.exports = {
  crearPlan,
  actualizarPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
  actualizarPlanesDeEquipo,
  cambiarEstadoPlan,
  obtenerPlanesPorUbicacionTecnica,
  obtenerMejorPlanPorUbicacionTecnica,
  actualizarPlanesDeUbicacionTecnica,
};