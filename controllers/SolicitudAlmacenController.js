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
    linea.rubroSapCode === "" ||
    linea.rubroSapCode === null ||
    linea.rubroSapCode === undefined
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

const limpiarCodigoOV = (valor) => {
  const raw = String(valor || "").trim();
  if (!raw) return null;

  return raw
    .replace(/\s+/g, "")
    .replace(/[\/\\]/g, "-")
    .replace(/[^a-zA-Z0-9\-_]/g, "");
};

const obtenerOVParaSolicitud = async ({ data, transaction }) => {
  let ordenVenta = null;

  if (data.ordenVenta) {
    ordenVenta = limpiarCodigoOV(data.ordenVenta);
  }

  if (!ordenVenta && data.ordenTrabajoId && esUUID(data.ordenTrabajoId)) {
    const ordenTrabajo = await OrdenTrabajo.findByPk(data.ordenTrabajoId, {
      transaction,
    });

    if (ordenTrabajo) {
      ordenVenta =
        limpiarCodigoOV(ordenTrabajo.ordenVenta) ||
        limpiarCodigoOV(ordenTrabajo.numeroOV) ||
        limpiarCodigoOV(ordenTrabajo.numeroOT);
    }
  }

  if (!ordenVenta && data.equipo_id) {
    const equipo = await Equipo.findByPk(data.equipo_id, { transaction });

    if (!equipo) {
      throw new Error("El equipo indicado no existe");
    }

    ordenVenta =
      limpiarCodigoOV(equipo.numeroOV) ||
      limpiarCodigoOV(equipo.ordenVenta) ||
      limpiarCodigoOV(equipo.ov);
  }

  if (!ordenVenta && data.ubicacion_tecnica_id) {
    const ubicacion = await UbicacionTecnica.findByPk(data.ubicacion_tecnica_id, {
      transaction,
    });

    if (!ubicacion) {
      throw new Error("La ubicación técnica indicada no existe");
    }

    ordenVenta =
      limpiarCodigoOV(ubicacion.numeroOV) ||
      limpiarCodigoOV(ubicacion.ordenVenta) ||
      limpiarCodigoOV(ubicacion.ov);
  }

  if (!ordenVenta) {
    return "SINOV";
  }

  return ordenVenta;
};

const generarNumeroSolicitudAlmacen = async ({ ordenVenta, transaction }) => {
  const ov = limpiarCodigoOV(ordenVenta) || "SINOV";

  const ultimoRegistro = await SolicitudAlmacen.findOne({
    where: {
      numeroSolicitud: {
        [Op.like]: `SA-${ov}-%`,
      },
    },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  let siguiente = 1;

  if (ultimoRegistro?.numeroSolicitud) {
    const match = String(ultimoRegistro.numeroSolicitud).match(/-(\d{3,})$/);
    if (match) {
      siguiente = Number(match[1]) + 1;
    }
  }

  return `SA-${ov}-${String(siguiente).padStart(3, "0")}`;
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

/* =========================================================
   CREATE
========================================================= */

const createSolicitudAlmacen = async ({ usuarioId, data }) => {
  const t = await sequelize.transaction();

  try {
    const errorValidacion = validarSolicitudAlmacenPayload(data);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    if (!data.tratamiento_id || !esUUID(data.tratamiento_id)) {
      throw new Error("tratamiento_id es obligatorio y debe ser un UUID válido");
    }

    if (data.equipo_id && !esUUID(data.equipo_id)) {
      throw new Error("equipo_id inválido");
    }

    if (data.ubicacion_tecnica_id && !esUUID(data.ubicacion_tecnica_id)) {
      throw new Error("ubicacion_tecnica_id inválido");
    }

    if (data.equipo_id && data.ubicacion_tecnica_id) {
      throw new Error("La solicitud no puede tener equipo_id y ubicacion_tecnica_id al mismo tiempo");
    }

    if (data.esGeneral === true && (data.equipo_id || data.ubicacion_tecnica_id)) {
      throw new Error("Una solicitud general no debe tener equipo_id ni ubicacion_tecnica_id");
    }

    if (
      data.esGeneral === false &&
      !data.equipo_id &&
      !data.ubicacion_tecnica_id
    ) {
      throw new Error("Una solicitud individual debe tener equipo_id o ubicacion_tecnica_id");
    }

    const tratamiento = await Tratamiento.findByPk(data.tratamiento_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!tratamiento) {
      throw new Error("El tratamiento indicado no existe");
    }

    if (data.equipo_id) {
      const equipo = await Equipo.findByPk(data.equipo_id, {
        transaction: t,
      });

      if (!equipo) {
        throw new Error("El equipo indicado no existe");
      }
    }

    if (data.ubicacion_tecnica_id) {
      const ubicacion = await UbicacionTecnica.findByPk(data.ubicacion_tecnica_id, {
        transaction: t,
      });

      if (!ubicacion) {
        throw new Error("La ubicación técnica indicada no existe");
      }
    }

    const requester = String(data.requester || data.email || "").trim();
    if (!requester) {
      throw new Error("requester o email es obligatorio");
    }

    const lineasNormalizadas = data.lineas.map(normalizarLinea);

    const ordenVenta = await obtenerOVParaSolicitud({
      data,
      transaction: t,
    });

    const numeroSolicitud = await generarNumeroSolicitudAlmacen({
      ordenVenta,
      transaction: t,
    });

    const solicitud = await SolicitudAlmacen.create(
      {
        usuario_id: usuarioId || null,
        tratamiento_id: data.tratamiento_id,
        ordenTrabajoId: data.ordenTrabajoId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        esGeneral: !!data.esGeneral,
        requiredDate: data.requiredDate,
        docDate: data.docDate || new Date(),
        department: data.department || null,
        requester,
        comments: data.comments || null,
        estado: data.estado || "DRAFT",
        numeroSolicitud,
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.bulkCreate(
      lineasNormalizadas.map((linea) => ({
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
      })),
      { transaction: t }
    );

    const creada = await SolicitudAlmacen.findByPk(solicitud.id, {
      include: [
        { model: SolicitudAlmacenLinea, as: "lineas" },
        { model: Tratamiento, as: "tratamiento" },
        { model: OrdenTrabajo, as: "ordenTrabajo" },
      ],
      transaction: t,
    });

    await t.commit();
    return creada;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

module.exports = {
  getSolicitudAlmacenById,
  updateSolicitudAlmacen,
  getSolicitudesAlmacenAgrupadasParaSap,
  createSolicitudAlmacen,
};