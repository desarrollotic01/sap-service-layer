const { Op } = require("sequelize");
const {
  sequelize,
  SolicitudAlmacen,
  SolicitudAlmacenLinea,
  Tratamiento,
  OrdenTrabajo,
  Equipo,
  UbicacionTecnica,
} = require("../db_connection");

/* =========================================================
   HELPERS
========================================================= */

const esUUID = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizarLinea = (linea = {}, idx = 0) => ({
  itemId: linea.itemId || null,
  itemCode: String(linea.itemCode || "").trim(),
  description: String(linea.description || "").trim(),
  quantity: toNumber(linea.quantity, 0),
  warehouseCode: String(linea.warehouseCode || "").trim(),
  costingCode: String(linea.costingCode || linea.costCenter || "").trim() || null,
  projectCode: String(linea.projectCode || "").trim() || null,
  rubroSapCode:
    linea.rubroSapCode === "" || linea.rubroSapCode === null || linea.rubroSapCode === undefined
      ? null
      : Number(linea.rubroSapCode),
  paqueteTrabajo: String(linea.paqueteTrabajo || "").trim() || null,
  _idx: idx,
});

const validarSolicitudAlmacenPayload = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "El body debe ser un objeto válido";
  }

  if (!data.requiredDate || typeof data.requiredDate !== "string") {
    return "requiredDate es obligatorio";
  }

  if (!data.requester && !data.email) {
    return "requester o email es obligatorio";
  }

  if (!Array.isArray(data.lineas) || data.lineas.length === 0) {
    return "Debe enviar al menos una línea";
  }

  for (let i = 0; i < data.lineas.length; i++) {
    const l = normalizarLinea(data.lineas[i], i);

    if (!l.itemCode) {
      return `itemCode es obligatorio en línea ${i + 1}`;
    }

    if (!l.description) {
      return `description es obligatorio en línea ${i + 1}`;
    }

    if (!Number.isFinite(l.quantity) || l.quantity <= 0) {
      return `quantity debe ser mayor a 0 en línea ${i + 1}`;
    }

    if (!l.warehouseCode) {
      return `warehouseCode es obligatorio en línea ${i + 1}`;
    }

    if (l.rubroSapCode !== null && !Number.isInteger(l.rubroSapCode)) {
      return `rubroSapCode inválido en línea ${i + 1}`;
    }
  }

  return null;
};

const buildLineaGroupKey = (linea) => {
  return [
    String(linea.itemId || ""),
    String(linea.itemCode || "").trim(),
    String(linea.description || "").trim(),
    String(linea.warehouseCode || "").trim(),
    String(linea.costingCode || "").trim(),
    String(linea.projectCode || "").trim(),
    String(linea.rubroSapCode ?? "").trim(),
    String(linea.paqueteTrabajo || "").trim(),
  ].join("__");
};

const agruparLineas = (lineas = []) => {
  const map = new Map();

  for (const raw of lineas) {
    const l = {
      itemId: raw.itemId || null,
      itemCode: raw.itemCode || "",
      description: raw.description || "",
      quantity: Number(raw.quantity) || 0,
      warehouseCode: raw.warehouseCode || "",
      costingCode: raw.costingCode || raw.costCenter || null,
      projectCode: raw.projectCode || null,
      rubroSapCode:
        raw.rubroSapCode === "" || raw.rubroSapCode === undefined
          ? null
          : raw.rubroSapCode,
      paqueteTrabajo: raw.paqueteTrabajo || null,
    };

    const key = buildLineaGroupKey(l);

    if (!map.has(key)) {
      map.set(key, { ...l });
    } else {
      const current = map.get(key);
      current.quantity = Number(current.quantity || 0) + Number(l.quantity || 0);
    }
  }

  return Array.from(map.values()).filter(
    (l) => l.itemCode && l.description && Number(l.quantity) > 0
  );
};

/* =========================================================
   GET BY ID
========================================================= */

const getSolicitudAlmacenById = async (id) => {
  const solicitud = await SolicitudAlmacen.findByPk(id, {
    include: [
      {
        model: SolicitudAlmacenLinea,
        as: "lineas",
      },
      {
        model: Tratamiento,
        as: "tratamiento",
      },
      {
        model: OrdenTrabajo,
        as: "ordenTrabajo",
      },
    ],
  });

  if (!solicitud) {
    throw new Error("Solicitud de almacén no encontrada");
  }

  return solicitud;
};

/* =========================================================
   UPDATE
========================================================= */

const updateSolicitudAlmacen = async ({ id, data }) => {
  const t = await sequelize.transaction();

  try {
    const solicitud = await SolicitudAlmacen.findByPk(id, {
      include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!solicitud) {
      throw new Error("Solicitud de almacén no encontrada");
    }

    if (solicitud.estado === "SENT") {
      throw new Error("No se puede editar una solicitud de almacén enviada a SAP");
    }

    const errorValidacion = validarSolicitudAlmacenPayload(data);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    const lineasNormalizadas = data.lineas.map(normalizarLinea);

    await solicitud.update(
      {
        requiredDate: data.requiredDate,
        department: data.department || null,
        requester: data.requester || data.email || null,
        comments: data.comments || null,
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.destroy({
      where: { solicitud_almacen_id: solicitud.id },
      transaction: t,
    });

    for (const linea of lineasNormalizadas) {
      await SolicitudAlmacenLinea.create(
        {
          solicitud_almacen_id: solicitud.id,
          itemId: linea.itemId,
          itemCode: linea.itemCode,
          description: linea.description,
          quantity: linea.quantity,
          warehouseCode: linea.warehouseCode,
          costingCode: linea.costingCode,
          projectCode: linea.projectCode,
          rubroSapCode: linea.rubroSapCode,
          paqueteTrabajo: linea.paqueteTrabajo,
        },
        { transaction: t }
      );
    }

    const actualizada = await SolicitudAlmacen.findByPk(solicitud.id, {
      include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
      transaction: t,
    });

    await t.commit();
    return actualizada;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/* =========================================================
   AGRUPAR PARA SAP
========================================================= */

const getSolicitudesAlmacenAgrupadasParaSap = async ({
  tratamientoId = null,
  ordenTrabajoId = null,
  incluirGeneral = true,
  incluirIndividuales = true,
}) => {
  if (!tratamientoId && !ordenTrabajoId) {
    throw new Error("Debe enviar tratamientoId u ordenTrabajoId");
  }

  const where = {};

  if (tratamientoId) where.tratamiento_id = tratamientoId;
  if (ordenTrabajoId) where.ordenTrabajoId = ordenTrabajoId;

  const solicitudes = await SolicitudAlmacen.findAll({
    where,
    include: [
      {
        model: SolicitudAlmacenLinea,
        as: "lineas",
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  let filtradas = solicitudes;

  if (incluirGeneral && !incluirIndividuales) {
    filtradas = solicitudes.filter((s) => s.esGeneral === true);
  }

  if (!incluirGeneral && incluirIndividuales) {
    filtradas = solicitudes.filter((s) => s.esGeneral === false);
  }

  if (!incluirGeneral && !incluirIndividuales) {
    filtradas = [];
  }

  const todasLasLineas = filtradas.flatMap((s) =>
    (s.lineas || []).map((l) => ({
      itemId: l.itemId,
      itemCode: l.itemCode,
      description: l.description,
      quantity: l.quantity,
      warehouseCode: l.warehouseCode,
      costingCode: l.costingCode,
      projectCode: l.projectCode,
      rubroSapCode: l.rubroSapCode,
      paqueteTrabajo: l.paqueteTrabajo,
      solicitudId: s.id,
      esGeneral: s.esGeneral,
      equipo_id: s.equipo_id,
      ubicacion_tecnica_id: s.ubicacion_tecnica_id,
    }))
  );

  const lineasAgrupadas = agruparLineas(todasLasLineas);

  return {
    totalSolicitudes: filtradas.length,
    totalLineasOriginales: todasLasLineas.length,
    totalLineasAgrupadas: lineasAgrupadas.length,
    solicitudes: filtradas,
    lineasAgrupadas,
  };
};

module.exports = {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
};