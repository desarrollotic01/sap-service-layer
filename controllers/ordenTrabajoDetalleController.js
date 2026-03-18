const { Op } = require("sequelize");
const {
  OrdenTrabajo,
  SolicitudAlmacen,
  SolicitudAlmacenLinea,
  SolicitudCompra,
  SolicitudCompraLinea,
  Tratamiento,
} = require("../db_connection"); // ajusta la ruta real

// Si ya la tienes en otro archivo, impórtala de ahí
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

function toPlain(data) {
  if (!data) return null;
  if (typeof data.toJSON === "function") return data.toJSON();
  return data;
}

function clasificarPorRelacion(solicitud, orden, equipoIds, ubicacionTecnicaIds) {
  if (!solicitud) return "SIN_RELACION_CLARA";

  if (solicitud.ordenTrabajoId && solicitud.ordenTrabajoId === orden.id) {
    return "ORDEN_TRABAJO";
  }

  if (solicitud.equipo_id && equipoIds.includes(solicitud.equipo_id)) {
    return "EQUIPO";
  }

  if (
    solicitud.ubicacion_tecnica_id &&
    ubicacionTecnicaIds.includes(solicitud.ubicacion_tecnica_id)
  ) {
    return "UBICACION_TECNICA";
  }

 if (
  orden.tratamientoId &&
  solicitud.tratamiento_id === orden.tratamientoId
) {
  return "TRATAMIENTO";
}

  return "SIN_RELACION_CLARA";
}

function separarSolicitudes(lista = [], orden, equipoIds, ubicacionTecnicaIds) {
  const generales = [];
  const porEquipo = [];

  for (const item of lista) {
    const solicitud = toPlain(item);
    const vinculacion = clasificarPorRelacion(
      solicitud,
      orden,
      equipoIds,
      ubicacionTecnicaIds
    );

    const enriched = {
      ...solicitud,
      vinculacion,
    };

    if (solicitud.esGeneral === true) {
      generales.push(enriched);
    } else {
      porEquipo.push(enriched);
    }
  }

  return {
    generales,
    porEquipo,
  };
}

async function getDetalleTratamientoOrdenTrabajo(ordenTrabajoId) {
  if (!ordenTrabajoId) {
    throw new Error("ordenTrabajoId es requerido");
  }

  const orden = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [
      {
        association: "tratamiento",
      },
      {
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "ubicacionTecnica" },
          { association: "planMantenimiento" },
          { association: "actividades" },
          { association: "trabajadores", include: ["trabajador"] },
        ],
      },
      { association: "adjuntos" },
      { association: "solicitudesCompra" },
    ],
  });

  if (!orden) {
    throw new Error("Orden de trabajo no encontrada");
  }

  const ordenPlain = toPlain(orden);

  const equipoIds = uniqueIds(
    (ordenPlain.equipos || []).map((eq) => eq.equipoId)
  );

  const ubicacionTecnicaIds = uniqueIds(
    (ordenPlain.equipos || []).map((eq) => eq.ubicacionTecnicaId)
  );

  const whereAlmacenOr = [{ ordenTrabajoId: ordenPlain.id }];
  const whereCompraOr = [{ ordenTrabajoId: ordenPlain.id }];

  if (ordenPlain.tratamientoId) {
    whereAlmacenOr.push({ tratamiento_id: ordenPlain.tratamientoId });
    whereCompraOr.push({ tratamiento_id: ordenPlain.tratamientoId });
  }

  if (equipoIds.length > 0) {
    whereAlmacenOr.push({
      equipo_id: { [Op.in]: equipoIds },
    });

    whereCompraOr.push({
      equipo_id: { [Op.in]: equipoIds },
    });
  }

  if (ubicacionTecnicaIds.length > 0) {
    whereAlmacenOr.push({
      ubicacion_tecnica_id: { [Op.in]: ubicacionTecnicaIds },
    });

    // solo si tu modelo SolicitudCompra realmente tiene este campo
    whereCompraOr.push({
      ubicacion_tecnica_id: { [Op.in]: ubicacionTecnicaIds },
    });
  }

  const [solicitudesAlmacenRaw, solicitudesCompraRaw] = await Promise.all([
    SolicitudAlmacen.findAll({
      where: {
        [Op.or]: whereAlmacenOr,
      },
      include: [
        {
          model: SolicitudAlmacenLinea,
          as: "lineas",
        },
      ],
      order: [["createdAt", "ASC"]],
    }),

    SolicitudCompra.findAll({
      where: {
        [Op.or]: whereCompraOr,
      },
      include: [
        {
          model: SolicitudCompraLinea,
          as: "lineas",
        },
      ],
      order: [["createdAt", "ASC"]],
    }),
  ]);

  const solicitudesAlmacen = separarSolicitudes(
    solicitudesAlmacenRaw,
    ordenPlain,
    equipoIds,
    ubicacionTecnicaIds
  );

  const solicitudesCompra = separarSolicitudes(
    solicitudesCompraRaw,
    ordenPlain,
    equipoIds,
    ubicacionTecnicaIds
  );

  const lineasAlmacenAgrupadas = agruparLineas(
    [...solicitudesAlmacen.generales, ...solicitudesAlmacen.porEquipo].flatMap((s) =>
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
      equipoIds,
      ubicacionTecnicaIds,
      totalSolicitudesCompra:
        solicitudesCompra.generales.length + solicitudesCompra.porEquipo.length,
      totalSolicitudesAlmacen:
        solicitudesAlmacen.generales.length + solicitudesAlmacen.porEquipo.length,
      totalLineasAlmacenAgrupadas: lineasAlmacenAgrupadas.length,
    },

    solicitudesCompra: {
      generales: solicitudesCompra.generales,
      porEquipo: solicitudesCompra.porEquipo,
    },

    solicitudesAlmacen: {
      generales: solicitudesAlmacen.generales,
      porEquipo: solicitudesAlmacen.porEquipo,
      lineasAgrupadasSap: lineasAlmacenAgrupadas,
    },
  };
}

module.exports = {
  getDetalleTratamientoOrdenTrabajo,
};