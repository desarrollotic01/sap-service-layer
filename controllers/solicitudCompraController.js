const { SolicitudCompra, SolicitudCompraLinea, Tratamiento, OrdenTrabajo, sequelize } = require("../db_connection");

const createSolicitudCompra = async (usuarioId, data) => {
  const t = await sequelize.transaction();

  try {
    const solicitud = await SolicitudCompra.create({
      usuario_id: usuarioId,
      docDate: data.docDate || new Date(),
      requiredDate: data.requiredDate,
      department: data.department || null,
      requester: data.requester || data.email || null,
      comments: data.comments || null,
      docCurrency: data.docCurrency || "PEN",
      docRate: data.docRate ?? 1,
      branchId: data.branchId ?? null,
      tratamiento_id: data.tratamiento_id,
      equipo_id: data.equipo_id || null,
      ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
      esGeneral: !!data.esGeneral,
      estado: "DRAFT",
    }, { transaction: t });

    for (const l of data.lineas) {
      await SolicitudCompraLinea.create({
        solicitud_compra_id: solicitud.id,
        itemCode: l.itemCode,
        description: l.description || null,
        quantity: l.quantity,
        warehouseCode: l.warehouseCode,
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubro: l.rubro || null,
        paqueteTrabajo: l.paqueteTrabajo || null,
      }, { transaction: t });
    }

    await t.commit();

    return await SolicitudCompra.findByPk(solicitud.id, {
      include: [{ association: "lineas" }],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

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

    await solicitud.update({
      requiredDate: data.requiredDate,
      department: data.department || null,
      requester: data.requester || null,
      comments: data.comments || null,
      docCurrency: data.docCurrency || "PEN",
      docRate: data.docRate ?? 1,
      branchId: data.branchId ?? null,
      tratamiento_id: data.tratamiento_id || solicitud.tratamiento_id,
      equipo_id: data.equipo_id ?? solicitud.equipo_id,
      ubicacion_tecnica_id: data.ubicacion_tecnica_id ?? solicitud.ubicacion_tecnica_id,
      esGeneral: typeof data.esGeneral === "boolean" ? data.esGeneral : solicitud.esGeneral,
    }, { transaction: t });

    await SolicitudCompraLinea.destroy({
      where: { solicitud_compra_id: solicitud.id },
      transaction: t,
    });

    for (const l of data.lineas) {
      await SolicitudCompraLinea.create({
        solicitud_compra_id: solicitud.id,
        itemCode: l.itemCode,
        description: l.description || null,
        quantity: l.quantity,
        warehouseCode: l.warehouseCode,
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubro: l.rubro || null,
        paqueteTrabajo: l.paqueteTrabajo || null,
      }, { transaction: t });
    }

    await t.commit();

    return await SolicitudCompra.findByPk(solicitud.id, {
      include: [{ association: "lineas" }],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

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
    estado: "SENT", // ✅ bloquea edición
  });

  return await SolicitudCompra.findByPk(solicitudGen.id, { include: ["lineas"] });
};

const getSolicitudCompraById = async (id) => {
  return await SolicitudCompra.findByPk(id, {
    include: [{ association: "lineas" }],
  });
};

module.exports = {
  createSolicitudCompra,
  // syncSolicitudCompra, // SAP luego
  updateSolicitudCompra,
  enviarSolicitudGeneral,
  getSolicitudCompraById,
};