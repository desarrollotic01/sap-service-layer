const {
  SolicitudCompra,
  SolicitudCompraLinea,
  Tratamiento,
  OrdenTrabajo,
  Equipo,
  UbicacionTecnica,
  sequelize,
} = require("../db_connection");
const { Op } = require("sequelize");

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

const limpiarCodigoOV = (valor) => {
  const raw = String(valor || "").trim();
  if (!raw) return null;

  return raw
    .replace(/\s+/g, "")
    .replace(/[\/\\]/g, "-")
    .replace(/[^a-zA-Z0-9\-_]/g, "");
};

const normalizarLineaCompra = (linea = {}, idx = 0) => ({
  itemCode: String(linea.itemCode || "").trim(),
  description: String(linea.description || "").trim() || null,
  quantity: toNumber(linea.quantity, 0),
  warehouseCode: String(linea.warehouseCode || "").trim(),
  costingCode: String(linea.costingCode || "").trim() || null,
  projectCode: String(linea.projectCode || "").trim() || null,
   rubroId: linea.rubroId || null,
  paqueteTrabajoId: linea.paqueteTrabajoId || null,
  _idx: idx,
});

const validarSolicitudCompraPayload = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "El body debe ser un objeto válido";
  }

  if (!data.requiredDate || typeof data.requiredDate !== "string") {
    return "requiredDate es obligatorio";
  }

  if (data.tratamiento_id && !esUUID(data.tratamiento_id)) {
  return "tratamiento_id inválido";
}

if (!data.tratamiento_id && !data.ordenTrabajoId) {
  return "Debe tener tratamiento_id o ordenTrabajoId";
}


  if (data.equipo_id && !esUUID(data.equipo_id)) {
    return "equipo_id inválido";
  }

  if (data.ubicacion_tecnica_id && !esUUID(data.ubicacion_tecnica_id)) {
    return "ubicacion_tecnica_id inválido";
  }

  if (data.equipo_id && data.ubicacion_tecnica_id) {
    return "La solicitud no puede tener equipo_id y ubicacion_tecnica_id al mismo tiempo";
  }

  if (data.esGeneral === true && (data.equipo_id || data.ubicacion_tecnica_id)) {
    return "Una solicitud general no debe tener equipo_id ni ubicacion_tecnica_id";
  }

  if (
    data.esGeneral === false &&
    !data.equipo_id &&
    !data.ubicacion_tecnica_id
  ) {
    return "Una solicitud individual debe tener equipo_id o ubicacion_tecnica_id";
  }

  const requester = String(data.requester || data.email || "").trim();
  if (!requester) {
    return "requester o email es obligatorio";
  }

  if (!Array.isArray(data.lineas) || data.lineas.length === 0) {
    return "Debe enviar al menos una línea";
  }

  for (let i = 0; i < data.lineas.length; i++) {
    const l = normalizarLineaCompra(data.lineas[i], i);

    if (!l.itemCode) {
      return `itemCode es obligatorio en línea ${i + 1}`;
    }

    if (!Number.isFinite(l.quantity) || l.quantity <= 0) {
      return `quantity debe ser mayor a 0 en línea ${i + 1}`;
    }

    if (!l.warehouseCode) {
      return `warehouseCode es obligatorio en línea ${i + 1}`;
    }
  }

  return null;
};

const obtenerOVParaSolicitudCompra = async ({ data, transaction }) => {
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

  return ordenVenta || "SINOV";
};

const generarNumeroSolicitudCompra = async ({ ordenVenta, transaction }) => {
  const ov = limpiarCodigoOV(ordenVenta) || "SINOV";

  const ultimoRegistro = await SolicitudCompra.findOne({
    where: {
      numeroSolicitud: {
        [Op.like]: `SC-${ov}-%`,
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

  return `SC-${ov}-${String(siguiente).padStart(3, "0")}`;
};

/* =========================================================
   CREATE
========================================================= */

const createSolicitudCompra = async (usuarioId, data) => {
  const t = await sequelize.transaction();

  try {
    const errorValidacion = validarSolicitudCompraPayload(data);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    let tratamiento = null;

if (data.tratamiento_id) {
  tratamiento = await Tratamiento.findByPk(data.tratamiento_id, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!tratamiento) {
    throw new Error("El tratamiento indicado no existe");
  }
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

    const lineasNormalizadas = data.lineas.map(normalizarLineaCompra);

    const ordenVenta = await obtenerOVParaSolicitudCompra({
      data,
      transaction: t,
    });

    const numeroSolicitud = await generarNumeroSolicitudCompra({
      ordenVenta,
      transaction: t,
    });

    const solicitud = await SolicitudCompra.create(
      {
        usuario_id: usuarioId || null,
        numeroSolicitud,
        docDate: data.docDate || new Date(),
        requiredDate: data.requiredDate,
        department: data.department || null,
        requester,
        comments: data.comments || null,
        docCurrency: data.docCurrency || "PEN",
        docRate: data.docRate ?? 1,
        branchId: data.branchId ?? null,
        tratamiento_id: data.tratamiento_id,
        ordenTrabajoId: data.ordenTrabajoId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        esGeneral: !!data.esGeneral,
        estado: "DRAFT",
       origen:
  data.origen ||
  (data.ordenTrabajoId ? "OT" : "TRATAMIENTO"),
  esCopia: data.esCopia || false,
  origenSolicitudId: data.origenSolicitudId || null,
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      lineasNormalizadas.map((l) => ({
        solicitud_compra_id: solicitud.id,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.quantity,
        warehouseCode: l.warehouseCode,
        costingCode: l.costingCode,
        projectCode: l.projectCode,
        rubroId: l.rubroId,
        paqueteTrabajoId: l.paqueteTrabajoId,
      })),
      { transaction: t }
    );

    await t.commit();

    return await SolicitudCompra.findByPk(solicitud.id, {
      include: [{ association: "lineas" }],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/* =========================================================
   UPDATE
========================================================= */

const updateSolicitudCompra = async (solicitudId, data) => {
  const t = await sequelize.transaction();

  try {
    const solicitud = await SolicitudCompra.findByPk(solicitudId, {
      include: [{ association: "lineas" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!solicitud) {
      await t.rollback();
      return null;
    }

    if (solicitud.estado !== "DRAFT") {
      await t.rollback();
      return "NO_EDITABLE";
    }

    if (solicitud.origen === "TRATAMIENTO") {
  return "NO_EDITABLE_TRATAMIENTO";
}

    const payloadValidacion = {
      ...data,
      tratamiento_id: data.tratamiento_id || solicitud.tratamiento_id,
      equipo_id:
        data.equipo_id !== undefined ? data.equipo_id : solicitud.equipo_id,
      ubicacion_tecnica_id:
        data.ubicacion_tecnica_id !== undefined
          ? data.ubicacion_tecnica_id
          : solicitud.ubicacion_tecnica_id,
      esGeneral:
        typeof data.esGeneral === "boolean" ? data.esGeneral : solicitud.esGeneral,
      requester: data.requester || data.email || solicitud.requester,
    };

    const errorValidacion = validarSolicitudCompraPayload(payloadValidacion);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }

    if (payloadValidacion.equipo_id) {
      const equipo = await Equipo.findByPk(payloadValidacion.equipo_id, {
        transaction: t,
      });

      if (!equipo) {
        throw new Error("El equipo indicado no existe");
      }
    }

    if (payloadValidacion.ubicacion_tecnica_id) {
      const ubicacion = await UbicacionTecnica.findByPk(
        payloadValidacion.ubicacion_tecnica_id,
        {
          transaction: t,
        }
      );

      if (!ubicacion) {
        throw new Error("La ubicación técnica indicada no existe");
      }
    }

const lineasNormalizadas = (data.lineas || []).map(normalizarLineaCompra);
    await solicitud.update(
      {
        requiredDate: data.requiredDate,
        department: data.department || null,
        requester: data.requester || data.email || null,
        comments: data.comments || null,
        docCurrency: data.docCurrency || "PEN",
        docRate: data.docRate ?? 1,
        branchId: data.branchId ?? null,
        tratamiento_id: data.tratamiento_id || solicitud.tratamiento_id,
        ordenTrabajoId:
          data.ordenTrabajoId !== undefined
            ? data.ordenTrabajoId
            : solicitud.ordenTrabajoId,
        equipo_id:
          data.equipo_id !== undefined ? data.equipo_id : solicitud.equipo_id,
        ubicacion_tecnica_id:
          data.ubicacion_tecnica_id !== undefined
            ? data.ubicacion_tecnica_id
            : solicitud.ubicacion_tecnica_id,
        esGeneral:
          typeof data.esGeneral === "boolean" ? data.esGeneral : solicitud.esGeneral,
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.destroy({
      where: { solicitud_compra_id: solicitud.id },
      transaction: t,
    });

    await SolicitudCompraLinea.bulkCreate(
      lineasNormalizadas.map((l) => ({
        solicitud_compra_id: solicitud.id,
        itemCode: l.itemCode,
        description: l.description,
        quantity: l.quantity,
        warehouseCode: l.warehouseCode,
        costingCode: l.costingCode,
        projectCode: l.projectCode,
         rubroId: l.rubroId,                
    paqueteTrabajoId: l.paqueteTrabajoId, 
      })),
      { transaction: t }
    );

    await t.commit();

    return await SolicitudCompra.findByPk(solicitud.id, {
      include: [{ association: "lineas" }],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/* =========================================================
   ENVIAR GENERAL
========================================================= */

const enviarSolicitudGeneral = async ({ avisoId, otId }) => {
  const ot = await OrdenTrabajo.findByPk(otId);
  if (!ot) throw new Error("OT no encontrada");

  const tratamiento = await Tratamiento.findOne({ where: { aviso_id: avisoId } });
  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  const solicitudGen = await SolicitudCompra.findOne({
    where: { tratamiento_id: tratamiento.id, esGeneral: true },
  });

  if (!solicitudGen) throw new Error("No existe solicitud general para este tratamiento");

  if (solicitudGen.estado !== "DRAFT") {
    throw new Error("La solicitud general ya fue enviada o no es editable");
  }

  if (solicitudGen.ordenTrabajoId) {
    throw new Error("La solicitud general ya está asignada a una OT");
  }

  await solicitudGen.update({
    ordenTrabajoId: otId,
    estado: "SENT",
  });

  return await SolicitudCompra.findByPk(solicitudGen.id, {
    include: [{ association: "lineas" }],
  });
};

/* =========================================================
   GET BY ID
========================================================= */

const getSolicitudCompraById = async (id) => {
  return await SolicitudCompra.findByPk(id, {
    include: [{ association: "lineas" }],
  });
};

module.exports = {
  createSolicitudCompra,
  updateSolicitudCompra,
  enviarSolicitudGeneral,
  getSolicitudCompraById,
};