const { Op } = require("sequelize");
const {
  OrdenTrabajo,
  SolicitudAlmacen,
  SolicitudAlmacenLinea,
  SolicitudCompra,
  SolicitudCompraLinea,
} = require("../db_connection"); // ajusta la ruta real

function agruparLineas(lineas = []) {
  const mapa = new Map();

  for (const linea of lineas) {
    const key = [
      linea.itemCode || "",
      linea.description || "",
      linea.warehouseCode || "",
      linea.costingCode || "",
      linea.projectCode || "",
      linea.rubroSapCode || "",
      linea.paqueteTrabajo || "",
    ].join("|");

    if (!mapa.has(key)) {
      mapa.set(key, {
        itemId: linea.itemId || null,
        itemCode: linea.itemCode || null,
        description: linea.description || null,
        quantity: Number(linea.quantity || 0),
        warehouseCode: linea.warehouseCode || null,
        costingCode: linea.costingCode || null,
        projectCode: linea.projectCode || null,
        rubroSapCode: linea.rubroSapCode || null,
        paqueteTrabajo: linea.paqueteTrabajo || null,
      });
    } else {
      const actual = mapa.get(key);
      actual.quantity += Number(linea.quantity || 0);
    }
  }

  return Array.from(mapa.values());
}

function uniqueIds(arr = []) {
  return [...new Set(arr.filter(Boolean))];
}

async function getDetalleSolicitudesTratamientoPorOrdenTrabajo(ordenTrabajoId) {
  if (!ordenTrabajoId) {
    throw new Error("ordenTrabajoId es requerido");
  }

  const orden = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [
      { association: "tratamiento" },
      {
        association: "equipos",
        attributes: ["id", "equipoId", "ubicacionTecnicaId"],
        include: [
          { association: "equipo" },
          { association: "ubicacionTecnica" },
          { association: "planMantenimiento" },
          { association: "actividades" },
          { association: "trabajadores", include: ["trabajador"] },
        ],
      },
      { association: "adjuntos" },
    ],
  });

  if (!orden) {
    throw new Error("Orden de trabajo no encontrada");
  }

  const ordenPlain = typeof orden.toJSON === "function" ? orden.toJSON() : orden;

  if (!ordenPlain.tratamientoId) {
    return {
      ordenTrabajo: ordenPlain,
      tratamiento: null,
      resumen: {
        tratamientoId: null,
        equipoIds: [],
        ubicacionTecnicaIds: [],
        totalSolicitudesCompra: 0,
        totalSolicitudesAlmacen: 0,
      },
      solicitudesCompra: {
        generales: [],
        especificas: [],
      },
      solicitudesAlmacen: {
        generales: [],
        especificas: [],
        lineasAgrupadasSap: [],
      },
    };
  }

  const equipoIds = uniqueIds(
    (ordenPlain.equipos || []).map((eq) => eq.equipoId || eq.equipo_id)
  );

  const ubicacionTecnicaIds = uniqueIds(
    (ordenPlain.equipos || []).map(
      (eq) => eq.ubicacionTecnicaId || eq.ubicacion_tecnica_id
    )
  );

  // =========================
  // COMPRA GENERAL
  // =========================
  const solicitudesCompraGenerales = await SolicitudCompra.findAll({
    where: {
      tratamiento_id: ordenPlain.tratamientoId,
      esGeneral: true,
    },
    include: [
      {
        model: SolicitudCompraLinea,
        as: "lineas",
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  // =========================
  // COMPRA ESPECIFICA SOLO DE ESTA OT
  // =========================
  const compraSpecificOr = [];

  if (ordenPlain.id) {
    compraSpecificOr.push({ ordenTrabajoId: ordenPlain.id });
  }

  if (equipoIds.length > 0) {
    compraSpecificOr.push({
      equipo_id: {
        [Op.in]: equipoIds,
      },
    });
  }

  if (ubicacionTecnicaIds.length > 0) {
    compraSpecificOr.push({
      ubicacion_tecnica_id: {
        [Op.in]: ubicacionTecnicaIds,
      },
    });
  }

  const solicitudesCompraEspecificas = compraSpecificOr.length
    ? await SolicitudCompra.findAll({
        where: {
          tratamiento_id: ordenPlain.tratamientoId,
          esGeneral: false,
          [Op.or]: compraSpecificOr,
        },
        include: [
          {
            model: SolicitudCompraLinea,
            as: "lineas",
          },
        ],
        order: [["createdAt", "ASC"]],
      })
    : [];

  // =========================
  // ALMACEN GENERAL
  // =========================
  const solicitudesAlmacenGenerales = await SolicitudAlmacen.findAll({
    where: {
      tratamiento_id: ordenPlain.tratamientoId,
      esGeneral: true,
    },
    include: [
      {
        model: SolicitudAlmacenLinea,
        as: "lineas",
      },
    ],
    order: [["createdAt", "ASC"]],
  });

  // =========================
  // ALMACEN ESPECIFICA SOLO DE ESTA OT
  // =========================
  const almacenSpecificOr = [];

  if (ordenPlain.id) {
    almacenSpecificOr.push({ ordenTrabajoId: ordenPlain.id });
  }

  if (equipoIds.length > 0) {
    almacenSpecificOr.push({
      equipo_id: {
        [Op.in]: equipoIds,
      },
    });
  }

  if (ubicacionTecnicaIds.length > 0) {
    almacenSpecificOr.push({
      ubicacion_tecnica_id: {
        [Op.in]: ubicacionTecnicaIds,
      },
    });
  }

  const solicitudesAlmacenEspecificas = almacenSpecificOr.length
    ? await SolicitudAlmacen.findAll({
        where: {
          tratamiento_id: ordenPlain.tratamientoId,
          esGeneral: false,
          [Op.or]: almacenSpecificOr,
        },
        include: [
          {
            model: SolicitudAlmacenLinea,
            as: "lineas",
          },
        ],
        order: [["createdAt", "ASC"]],
      })
    : [];

  const compraGenerales = solicitudesCompraGenerales.map((s) => ({
    ...s.toJSON(),
    origenVista: "GENERAL",
  }));

  const compraEspecificas = solicitudesCompraEspecificas.map((s) => ({
    ...s.toJSON(),
    origenVista: "ESPECIFICA_OT",
  }));

  const almacenGenerales = solicitudesAlmacenGenerales.map((s) => ({
    ...s.toJSON(),
    origenVista: "GENERAL",
  }));

  const almacenEspecificas = solicitudesAlmacenEspecificas.map((s) => ({
    ...s.toJSON(),
    origenVista: "ESPECIFICA_OT",
  }));

  const lineasAlmacenAgrupadasSap = agruparLineas(
    [...almacenGenerales, ...almacenEspecificas].flatMap((s) =>
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
      }))
    )
  );

  return {
    ordenTrabajo: ordenPlain,
    tratamiento: ordenPlain.tratamiento || null,
    resumen: {
      tratamientoId: ordenPlain.tratamientoId,
      equipoIds,
      ubicacionTecnicaIds,
      totalSolicitudesCompra: compraGenerales.length + compraEspecificas.length,
      totalSolicitudesAlmacen: almacenGenerales.length + almacenEspecificas.length,
    },
    solicitudesCompra: {
      generales: compraGenerales,
      especificas: compraEspecificas,
    },
    solicitudesAlmacen: {
      generales: almacenGenerales,
      especificas: almacenEspecificas,
      lineasAgrupadasSap,
    },
  };
}

module.exports = {
  getDetalleSolicitudesTratamientoPorOrdenTrabajo,
};