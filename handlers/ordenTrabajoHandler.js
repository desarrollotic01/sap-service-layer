const ordenTrabajoController = require("../controllers/ordenTrabajoController");
const {
  getDetalleSolicitudesTratamientoPorOrdenTrabajo,
} = require("../controllers/ordenTrabajoDetalleController");

/* =========================================================
   HELPERS DE VALIDACIÓN
========================================================= */
const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const isTargetKey = (v) =>
  typeof v === "string" && (/^E:.+$/i.test(v) || /^U:.+$/i.test(v));

const TIPOS_TRABAJO_VALIDOS = [
  "TORQUEO_REGULACION", "APLICACION", "REVISION", "INSPECCION",
  "CAMBIO", "LIMPIEZA", "AJUSTE", "LUBRICACION", "REPARACION",
];

/* =========================================================
   GET SOLICITUDES POR OT
========================================================= */
async function obtenerSolicitudesPorOTHandler(req, res) {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ errors: ["Usuario no autenticado"] });
    }
    if (!id) {
      return res.status(400).json({ errors: ["ordenTrabajoId es obligatorio"] });
    }

    const solicitudes = await ordenTrabajoController.obtenerSolicitudesPorOT(id);
    return res.json(solicitudes);
  } catch (error) {
    console.error("ERROR GET SOLICITUDES OT:", error);
    return res.status(500).json({ errors: ["Error al obtener solicitudes de la OT"] });
  }
}

/* =========================================================
   GET SOLICITUDES GENERALES PENDIENTES (sin OT asignada)
   Útil para el modal del frontend en modo INDIVIDUAL
========================================================= */
async function obtenerSolicitudesGeneralesPendientesHandler(req, res) {
  try {
    const { avisoId } = req.params;

    if (!avisoId || !isUuid(avisoId)) {
      return res.status(400).json({ errors: ["avisoId debe ser un UUID válido"] });
    }

    const resultado =
      await ordenTrabajoController.obtenerSolicitudesGeneralesPendientes(avisoId);

    return res.json({ success: true, data: resultado });
  } catch (error) {
    console.error("ERROR GET SOLICITUDES GENERALES PENDIENTES:", error);
    return res.status(500).json({ errors: [error.message] });
  }
}

/* =========================================================
   POST ASIGNAR SOLICITUD GENERAL A UNA OT
   Permite asignar la solicitud general que quedó sin OT
========================================================= */
async function asignarSolicitudGeneralAOTHandler(req, res) {
  try {
    const { id: ordenTrabajoId } = req.params;
    const { solicitudCompraId, solicitudAlmacenId } = req.body || {};

    if (!ordenTrabajoId || !isUuid(ordenTrabajoId)) {
      return res.status(400).json({ errors: ["ordenTrabajoId debe ser un UUID válido"] });
    }

    if (!solicitudCompraId && !solicitudAlmacenId) {
      return res.status(400).json({
        errors: ["Debe enviar al menos solicitudCompraId o solicitudAlmacenId"],
      });
    }

    if (solicitudCompraId && !isUuid(solicitudCompraId)) {
      return res.status(400).json({ errors: ["solicitudCompraId debe ser un UUID válido"] });
    }

    if (solicitudAlmacenId && !isUuid(solicitudAlmacenId)) {
      return res.status(400).json({ errors: ["solicitudAlmacenId debe ser un UUID válido"] });
    }

    const resultado = await ordenTrabajoController.asignarSolicitudGeneralAOT({
      solicitudCompraId: solicitudCompraId || null,
      solicitudAlmacenId: solicitudAlmacenId || null,
      ordenTrabajoId,
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    console.error("ERROR ASIGNAR SOLICITUD GENERAL:", error);
    return res.status(400).json({ errors: [error.message] });
  }
}

/* =========================================================
   POST CREAR OT
========================================================= */
async function crearOrdenTrabajoHandler(req, res) {
  try {
    const errors = [];

    const {
      avisoId,
      equipos,
      modo = "GRUPAL",
      solicitudGeneralStrategy,
      solicitudesCompra,
      solicitudesAlmacen,
      tipoMantenimiento,
      numeroOT,
      descripcionGeneral,
      estado,
      supervisorId,
      fechaProgramadaInicio,
      fechaProgramadaFin,
      fechaInicioReal,
      fechaFinReal,
      fechaCierre,
      observaciones,
      adjuntos,
    } = req.body || {};

    /* ── Validaciones generales ───────────────────────── */
    if (!avisoId) errors.push("avisoId es requerido");
    if (!Array.isArray(equipos) || equipos.length === 0)
      errors.push("Debe incluir al menos un equipo o ubicación técnica");

    if (!["GRUPAL", "INDIVIDUAL"].includes(modo))
      errors.push("modo inválido. Use GRUPAL o INDIVIDUAL");

    if (
      tipoMantenimiento !== undefined &&
      !["Preventivo", "Correctivo", "Mejora", "Predictivo"].includes(tipoMantenimiento)
    ) errors.push("tipoMantenimiento no es válido");

    if (
      estado !== undefined &&
      !["CREADO", "LIBERADO", "CIERRE_TECNICO", "CERRADO", "CANCELADO"].includes(estado)
    ) errors.push("estado no es válido");

    if (numeroOT !== undefined && (typeof numeroOT !== "string" || !numeroOT.trim()))
      errors.push("numeroOT debe ser un texto válido");

    if (descripcionGeneral !== undefined && typeof descripcionGeneral !== "string")
      errors.push("descripcionGeneral debe ser texto");

    if (adjuntos !== undefined && !Array.isArray(adjuntos))
      errors.push("adjuntos debe ser un array");

    /* ── Validar solicitudGeneralStrategy (solo INDIVIDUAL) ── */
    if (modo === "INDIVIDUAL") {
      if (solicitudGeneralStrategy !== undefined && solicitudGeneralStrategy !== null) {
        if (typeof solicitudGeneralStrategy !== "object" || Array.isArray(solicitudGeneralStrategy)) {
          errors.push("solicitudGeneralStrategy debe ser un objeto");
        } else {
          // Validar compra
          const estratCompra = solicitudGeneralStrategy.compra;
          if (estratCompra !== undefined) {
            if (!estratCompra?.tipo || !["ASIGNAR", "NINGUNA"].includes(estratCompra.tipo)) {
              errors.push("solicitudGeneralStrategy.compra.tipo debe ser ASIGNAR o NINGUNA");
            }
            if (estratCompra?.tipo === "ASIGNAR") {
              if (!estratCompra.targetKey) {
                errors.push("solicitudGeneralStrategy.compra.targetKey es obligatorio cuando tipo=ASIGNAR");
              } else if (!isTargetKey(estratCompra.targetKey)) {
                errors.push('solicitudGeneralStrategy.compra.targetKey debe tener formato "E:<uuid>" o "U:<uuid>"');
              }
            }
          }

          // Validar almacén
          const estratAlmacen = solicitudGeneralStrategy.almacen;
          if (estratAlmacen !== undefined) {
            if (!estratAlmacen?.tipo || !["ASIGNAR", "NINGUNA"].includes(estratAlmacen.tipo)) {
              errors.push("solicitudGeneralStrategy.almacen.tipo debe ser ASIGNAR o NINGUNA");
            }
            if (estratAlmacen?.tipo === "ASIGNAR") {
              if (!estratAlmacen.targetKey) {
                errors.push("solicitudGeneralStrategy.almacen.targetKey es obligatorio cuando tipo=ASIGNAR");
              } else if (!isTargetKey(estratAlmacen.targetKey)) {
                errors.push('solicitudGeneralStrategy.almacen.targetKey debe tener formato "E:<uuid>" o "U:<uuid>"');
              }
            }
          }
        }
      }
    }

    /* ── Validar estructura de solicitudes (opcional) ─── */
    const validarSolicitudesPayload = (solicitudes, label) => {
      if (!solicitudes) return;
      if (typeof solicitudes !== "object" || Array.isArray(solicitudes)) {
        errors.push(`${label} debe ser un objeto`);
        return;
      }
      // general puede ser null o un objeto con requiredDate y lineas
      if (solicitudes.general !== undefined && solicitudes.general !== null) {
        if (!solicitudes.general.requiredDate) {
          errors.push(`${label}.general: requiredDate es obligatorio`);
        }
        if (!Array.isArray(solicitudes.general.lineas) || solicitudes.general.lineas.length === 0) {
          errors.push(`${label}.general: debe tener al menos una línea`);
        }
      }
      // porEquipo
      if (solicitudes.porEquipo !== undefined) {
        if (typeof solicitudes.porEquipo !== "object" || Array.isArray(solicitudes.porEquipo)) {
          errors.push(`${label}.porEquipo debe ser un objeto`);
        } else {
          for (const [key, data] of Object.entries(solicitudes.porEquipo)) {
            if (!data) continue;
            if (!data.requiredDate) {
              errors.push(`${label}.porEquipo[${key}]: requiredDate es obligatorio`);
            }
            if (!Array.isArray(data.lineas) || data.lineas.length === 0) {
              errors.push(`${label}.porEquipo[${key}]: debe tener al menos una línea`);
            }
          }
        }
      }
    };

    validarSolicitudesPayload(solicitudesCompra, "solicitudesCompra");
    validarSolicitudesPayload(solicitudesAlmacen, "solicitudesAlmacen");

    /* ── Validar equipos ─────────────────────────────── */
    if (Array.isArray(equipos)) {
      for (const [index, equipo] of equipos.entries()) {
        const tieneEquipoId = !!equipo.equipoId;
        const tieneUbicacionTecnicaId = !!equipo.ubicacionTecnicaId;

        if (
          (tieneEquipoId && tieneUbicacionTecnicaId) ||
          (!tieneEquipoId && !tieneUbicacionTecnicaId)
        ) {
          errors.push(
            `El equipo en posición ${index} debe tener solo equipoId o solo ubicacionTecnicaId`
          );
        }

        if (
          equipo.prioridad !== undefined &&
          !["BAJA", "MEDIA", "ALTA", "CRITICA"].includes(equipo.prioridad)
        ) errors.push(`prioridad no válida en equipo posición ${index}`);

        if (
          equipo.estadoEquipo !== undefined &&
          !["PENDIENTE", "EN_PROCESO", "FINALIZADO", "CANCELADO"].includes(equipo.estadoEquipo)
        ) errors.push(`estadoEquipo no válido en equipo posición ${index}`);

        if (equipo.trabajadores !== undefined && !Array.isArray(equipo.trabajadores))
          errors.push(`trabajadores debe ser array en equipo posición ${index}`);

        if (equipo.actividades !== undefined && !Array.isArray(equipo.actividades))
          errors.push(`actividades debe ser array en equipo posición ${index}`);

        if (equipo.adjuntos !== undefined && !Array.isArray(equipo.adjuntos))
          errors.push(`adjuntos debe ser array en equipo posición ${index}`);

        if (Array.isArray(equipo.trabajadores)) {
          const encargados = equipo.trabajadores.filter((t) => t.esEncargado === true);
          if (encargados.length > 1) {
            errors.push(`Solo puede haber un encargado por equipo en posición ${index}`);
          }
          for (const [tIndex, trabajador] of equipo.trabajadores.entries()) {
            if (!trabajador.trabajadorId || typeof trabajador.trabajadorId !== "string") {
              errors.push(
                `trabajadorId es requerido en trabajador posición ${tIndex} del equipo ${index}`
              );
            }
          }
        }

        if (Array.isArray(equipo.actividades)) {
          for (const [aIndex, actividad] of equipo.actividades.entries()) {
            if (!actividad.tarea || typeof actividad.tarea !== "string") {
              errors.push(
                `tarea es requerida en actividad posición ${aIndex} del equipo ${index}`
              );
            }
            if (
              actividad.tipoTrabajo !== undefined &&
              !TIPOS_TRABAJO_VALIDOS.includes(actividad.tipoTrabajo)
            ) errors.push(`tipoTrabajo no válido en actividad posición ${aIndex} del equipo ${index}`);

            if (
              actividad.estado !== undefined &&
              !["PENDIENTE", "EN_PROCESO", "COMPLETADA", "OMITIDA"].includes(actividad.estado)
            ) errors.push(`estado no válido en actividad posición ${aIndex} del equipo ${index}`);

            if (
              actividad.origen !== undefined &&
              !["PLAN", "MANUAL", "TRATAMIENTO"].includes(actividad.origen)
            ) errors.push(`origen no válido en actividad posición ${aIndex} del equipo ${index}`);

            if (
              actividad.unidadDuracion !== undefined &&
              !["min", "h"].includes(actividad.unidadDuracion)
            ) errors.push(`unidadDuracion no válida en actividad posición ${aIndex} del equipo ${index}`);

            if (
              actividad.cantidadTecnicos !== undefined &&
              (isNaN(Number(actividad.cantidadTecnicos)) || Number(actividad.cantidadTecnicos) < 1)
            ) errors.push(`cantidadTecnicos no válida en actividad posición ${aIndex} del equipo ${index}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const ots = await ordenTrabajoController.crearOrdenTrabajo(req.body);

    return res.status(201).json({
      success: true,
      message: "Orden(es) de trabajo creada(s) correctamente",
      data: ots,
    });
  } catch (error) {
    console.error("ERROR CREAR OT:", error);
    return res.status(500).json({
      success: false,
      errors: [error.message || "Error interno al crear la OT"],
    });
  }
}

/* =========================================================
   GET TODOS
========================================================= */
async function obtenerOrdenesTrabajoHandler(req, res) {
  try {
    const ots = await ordenTrabajoController.obtenerOrdenesTrabajo();
    res.json(ots);
  } catch (error) {
    console.error("ERROR GET OTS:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================================================
   GET POR ID
========================================================= */
async function obtenerOrdenTrabajoPorIdHandler(req, res) {
  try {
    const ot = await ordenTrabajoController.obtenerOrdenTrabajoPorId(req.params.id);
    if (!ot) return res.status(404).json({ message: "OT no encontrada" });
    res.json(ot);
  } catch (error) {
    console.error("ERROR GET OT:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================================================
   PATCH ACTUALIZAR COMPLETA
========================================================= */
async function actualizarOrdenTrabajoCompletaHandler(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "El id de la orden de trabajo es requerido",
      });
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: "El body debe ser un objeto válido",
      });
    }

    const camposPermitidos = [
      "numeroOT", "tipoMantenimiento", "descripcionGeneral", "estado",
      "supervisorId", "fechaProgramadaInicio", "fechaProgramadaFin",
      "fechaInicioReal", "fechaFinReal", "fechaCierre", "observaciones",
      "avisoId", "tratamientoId", "equipos", "adjuntos",
    ];

    const camposInvalidos = Object.keys(data).filter(
      (c) => !camposPermitidos.includes(c)
    );
    if (camposInvalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Se enviaron campos no permitidos",
        camposInvalidos,
      });
    }

    if (
      data.tipoMantenimiento !== undefined &&
      !["Preventivo", "Correctivo", "Mejora", "Predictivo"].includes(data.tipoMantenimiento)
    ) {
      return res.status(400).json({ success: false, message: "tipoMantenimiento no es válido" });
    }

    if (
      data.estado !== undefined &&
      !["CREADO", "LIBERADO", "CIERRE_TECNICO", "CERRADO", "CANCELADO"].includes(data.estado)
    ) {
      return res.status(400).json({ success: false, message: "estado no es válido" });
    }

    if (data.equipos !== undefined && !Array.isArray(data.equipos)) {
      return res.status(400).json({ success: false, message: "equipos debe ser un array" });
    }

    if (data.adjuntos !== undefined && !Array.isArray(data.adjuntos)) {
      return res.status(400).json({ success: false, message: "adjuntos debe ser un array" });
    }

    const otActualizada = await ordenTrabajoController.actualizarOrdenTrabajoCompleta(id, data);

    if (!otActualizada) {
      return res.status(404).json({ success: false, message: "Orden de trabajo no encontrada" });
    }

    return res.status(200).json({
      success: true,
      message: "Orden de trabajo actualizada correctamente",
      data: otActualizada,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZAR OT:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar la orden de trabajo",
      error: error.message,
    });
  }
}

/* =========================================================
   DELETE
========================================================= */
async function eliminarOrdenTrabajoHandler(req, res) {
  try {
    const eliminado = await ordenTrabajoController.eliminarOrdenTrabajo(req.params.id);
    if (!eliminado) return res.status(404).json({ message: "OT no encontrada" });
    res.json({ message: "OT eliminada correctamente" });
  } catch (error) {
    console.error("ERROR DELETE OT:", error);
    res.status(500).json({ message: "Error al eliminar OT" });
  }
}

/* =========================================================
   PATCH LIBERAR
========================================================= */
async function liberarOrdenTrabajoHandler(req, res) {
  try {
    const { id } = req.params;
    const ot = await ordenTrabajoController.liberarOrdenTrabajo(id);
    res.json({ message: "Orden de Trabajo liberada correctamente", data: ot });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

/* =========================================================
   GET DETALLE SOLICITUDES TRATAMIENTO POR OT
========================================================= */
async function getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "El id de la orden de trabajo es requerido",
      });
    }
    const data = await getDetalleSolicitudesTratamientoPorOrdenTrabajo(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener solicitudes del tratamiento por OT:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
    });
  }
}

/* =========================================================
   POST SYNC SAP
========================================================= */
async function syncSAPOrdenTrabajoHandler(req, res) {
  try {
    const { id } = req.params;
    const result = await ordenTrabajoController.syncSolicitudesCompraOT(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/* =========================================================
   GET PREVIEW SOLICITUDES
========================================================= */
async function previewSolicitudesHandler(req, res) {
  try {
    const data = await ordenTrabajoController.previewSolicitudesOT(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/* =========================================================
   POST GENERAR SOLICITUD COMPRA
========================================================= */
async function generarSolicitudCompraHandler(req, res) {
  try {
    const solicitud = await ordenTrabajoController.generarSolicitudCompraOT(req.params.id);
    res.json({ success: true, data: solicitud });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

/* =========================================================
   POST GENERAR SOLICITUD ALMACÉN
========================================================= */
async function generarSolicitudAlmacenHandler(req, res) {
  try {
    const { destinatarioId } = req.body;
    if (!destinatarioId) {
      return res.status(400).json({
        success: false,
        message: "destinatarioId es obligatorio",
      });
    }
    const resultado = await ordenTrabajoController.generarSolicitudAlmacenOT(
      req.params.id,
      { destinatarioId }
    );
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}


async function crearSolicitudCompraGeneralHandler(req, res) {
  try {
    const { id } = req.params;
    const { requiredDate, lineas } = req.body || {};
    const usuarioId = req.user?.id;

    const errors = [];

    if (!id || !isUuid(id)) errors.push("ordenTrabajoId debe ser un UUID válido");
    if (!usuarioId) errors.push("Usuario no autenticado");
    if (!requiredDate) errors.push("requiredDate es obligatorio");
    if (!Array.isArray(lineas) || lineas.length === 0)
      errors.push("Debe enviar al menos una línea");

    if (Array.isArray(lineas)) {
      for (const [i, l] of lineas.entries()) {
        if (!l.itemCode) errors.push(`Línea ${i + 1}: itemCode es obligatorio`);
        if (!l.quantity || Number(l.quantity) <= 0)
          errors.push(`Línea ${i + 1}: quantity debe ser mayor a 0`);
        if (!l.rubroId) errors.push(`Línea ${i + 1}: rubroId es obligatorio`);
        if (!l.paqueteTrabajoId)
          errors.push(`Línea ${i + 1}: paqueteTrabajoId es obligatorio`);
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors });

    const solicitud = await ordenTrabajoController.crearSolicitudCompraGeneralEnOT(
      id,
      { requiredDate, lineas },
      usuarioId
    );

    return res.status(201).json({ success: true, data: solicitud });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function crearSolicitudAlmacenGeneralHandler(req, res) {
  try {
    const { id } = req.params;
    const { requiredDate, lineas } = req.body || {};
    const usuarioId = req.user?.id;

    const errors = [];

    if (!id || !isUuid(id)) errors.push("ordenTrabajoId debe ser un UUID válido");
    if (!usuarioId) errors.push("Usuario no autenticado");
    if (!requiredDate) errors.push("requiredDate es obligatorio");
    if (!Array.isArray(lineas) || lineas.length === 0)
      errors.push("Debe enviar al menos una línea");

    if (Array.isArray(lineas)) {
      for (const [i, l] of lineas.entries()) {
        if (!l.itemCode) errors.push(`Línea ${i + 1}: itemCode es obligatorio`);
        if (!l.quantity || Number(l.quantity) <= 0)
          errors.push(`Línea ${i + 1}: quantity debe ser mayor a 0`);
        if (!l.rubroId) errors.push(`Línea ${i + 1}: rubroId es obligatorio`);
        if (!l.paqueteTrabajoId)
          errors.push(`Línea ${i + 1}: paqueteTrabajoId es obligatorio`);
      }
    }

    if (errors.length > 0) return res.status(400).json({ errors });

    const solicitud = await ordenTrabajoController.crearSolicitudAlmacenGeneralEnOT(
      id,
      { requiredDate, lineas },
      usuarioId
    );

    return res.status(201).json({ success: true, data: solicitud });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}
/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  crearOrdenTrabajoHandler,
  obtenerOrdenesTrabajoHandler,
  obtenerOrdenTrabajoPorIdHandler,
  actualizarOrdenTrabajoCompletaHandler,
  eliminarOrdenTrabajoHandler,
  liberarOrdenTrabajo: liberarOrdenTrabajoHandler,
  getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler,
  syncSAPOrdenTrabajoHandler,
  obtenerSolicitudesPorOTHandler,
  previewSolicitudesHandler,
  generarSolicitudCompraHandler,
  generarSolicitudAlmacenHandler,
  // Nuevos handlers para solicitud general pendiente
  obtenerSolicitudesGeneralesPendientesHandler,
  asignarSolicitudGeneralAOTHandler,
  crearSolicitudCompraGeneralHandler,
  crearSolicitudAlmacenGeneralHandler,
};