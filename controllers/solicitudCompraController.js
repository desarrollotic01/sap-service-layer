const { SolicitudCompra, SolicitudCompraLinea, Tratamiento, OrdenTrabajo } = require("../db_connection");
// const sapService = require("../services/sap.services"); // SAP luego

const createSolicitudCompra = async (usuarioId, data) => {
  const solicitud = await SolicitudCompra.create({
    usuario_id: usuarioId,

    docDate: data.docDate || new Date(),       
    requiredDate: data.requiredDate,
    department: data.department || null,
    requester: data.requester || data.email,   
    comments: data.comments || null,
    docCurrency: data.docCurrency || "PEN",
    docRate: data.docRate ?? 1,
    branchId: data.branchId ?? null,             

    tratamiento_id: data.tratamiento_id,       
    equipo_id: data.equipo_id || null,
    ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
    esGeneral: !!data.esGeneral,

    estado: "DRAFT",
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
    });
  }

  return await SolicitudCompra.findByPk(solicitud.id, { include: ["lineas"] });
};

// SAP luego (lo dejo comentado para que no rompa)
// const syncSolicitudCompra = async (solicitudId) => { ... }

const updateSolicitudCompra = async (solicitudId, data) => {
  const solicitud = await SolicitudCompra.findByPk(solicitudId, {
    include: [{ association: "lineas" }],
  });

  if (!solicitud) return null;
  if (solicitud.estado !== "DRAFT") return "NO_EDITABLE";

  await solicitud.update({
    requiredDate: data.requiredDate,
    department: data.department || null,
    requester: data.requester,
    comments: data.comments || null,
    docCurrency: data.docCurrency || "PEN",
    docRate: data.docRate ?? 1,
    branchId: data.branchId ?? null,
  });

  await SolicitudCompraLinea.destroy({
    where: { solicitud_compra_id: solicitud.id },
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
    });
  }

  return await SolicitudCompra.findByPk(solicitud.id, {
    include: [{ association: "lineas" }],
  });
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

module.exports = {
  createSolicitudCompra,
  // syncSolicitudCompra, // SAP luego
  updateSolicitudCompra,
  enviarSolicitudGeneral,
};