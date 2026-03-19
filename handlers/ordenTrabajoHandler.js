const ordenTrabajoController = require("../controllers/ordenTrabajoController");
const {  getDetalleSolicitudesTratamientoPorOrdenTrabajo,
} = require("../controllers/ordenTrabajoDetalleController");

/* =========================
   CREAR OT
========================= */
async function crearOrdenTrabajoHandler(req, res) {
  try {
    const errors = [];

    const {
      avisoId,
      equipos,
      modo = "GRUPAL", // GRUPAL | INDIVIDUAL | MIXTO
      grupalEquipoIds = [],
      individualEquipoIds = [],
      solicitudGeneralStrategy = "OT_GRUPAL", // NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA
      otKeyGeneral = null,
    } = req.body || {};

    // ✅ avisoId
    if (!avisoId) errors.push("avisoId es requerido");

    // ✅ equipos
    if (Array.isArray(equipos) && equipos.length === 0) errors.push("Debe incluir al menos un equipo");

    // ✅ modo
    if (modo && !["GRUPAL", "INDIVIDUAL", "MIXTO"].includes(modo)) {
      errors.push("modo inválido. Use GRUPAL | INDIVIDUAL | MIXTO");
    }

    // ✅ estrategia solicitud general
    if (
      solicitudGeneralStrategy &&
      !["NINGUNA", "OT_GRUPAL", "PRIMERA_OT", "OT_ESPECIFICA"].includes(solicitudGeneralStrategy)
    ) {
      errors.push("solicitudGeneralStrategy inválida. Use NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA");
    }

    if (solicitudGeneralStrategy === "OT_ESPECIFICA") {
      if (!otKeyGeneral) {
        errors.push("otKeyGeneral es requerido cuando solicitudGeneralStrategy=OT_ESPECIFICA");
      } else {
        // debe ser "GRUPAL" o "E:<id>"
        const ok = otKeyGeneral === "GRUPAL" || /^E:\d+$/.test(String(otKeyGeneral));
        if (!ok) errors.push('otKeyGeneral inválido. Use "GRUPAL" o "E:<equipoId>" (ej: E:15)');
      }
    }

    // ✅ MIXTO: arreglos obligatorios y sin cruces (validación base)
    if (modo === "MIXTO") {
      if (!Array.isArray(grupalEquipoIds) || grupalEquipoIds.length === 0) {
        errors.push("En MIXTO debe enviar grupalEquipoIds (arreglo con ids)");
      }
      if (!Array.isArray(individualEquipoIds) || individualEquipoIds.length === 0) {
        errors.push("En MIXTO debe enviar individualEquipoIds (arreglo con ids)");
      }

      if (Array.isArray(grupalEquipoIds) && Array.isArray(individualEquipoIds)) {
        const set = new Set([...grupalEquipoIds, ...individualEquipoIds]);
        if (set.size !== grupalEquipoIds.length + individualEquipoIds.length) {
          errors.push("Un equipo no puede estar en grupal e individual a la vez");
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const ots = await ordenTrabajoController.crearOrdenTrabajo(req.body);

    return res.status(201).json(ots);
  } catch (error) {
    console.error("ERROR CREAR OT:", error);

    return res.status(500).json({
      errors: ["Error interno al crear la OT"],
    });
  }
}

/* =========================
   GET TODOS
========================= */
async function obtenerOrdenesTrabajoHandler(req, res) {
  try {
    const ots = await ordenTrabajoController.obtenerOrdenesTrabajo();
    res.json(ots);
  } catch (error) {
    console.error("ERROR GET OTS:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================
   GET POR ID
========================= */
async function obtenerOrdenTrabajoPorIdHandler(req, res) {
  try {
    const ot = await ordenTrabajoController.obtenerOrdenTrabajoPorId(req.params.id);

    if (!ot) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json(ot);
  } catch (error) {
    console.error("ERROR GET OT:", error);
    res.status(500).json({ message: "Error al obtener OT" });
  }
}

/* =========================
   UPDATE
========================= */
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

    const camposOTPermitidos = [
      "numeroOT",
      "tipoMantenimiento",
      "descripcionGeneral",
      "estado",
      "supervisorId",
      "fechaProgramadaInicio",
      "fechaProgramadaFin",
      "fechaInicioReal",
      "fechaFinReal",
      "fechaCierre",
      "observaciones",
      "avisoId",
      "tratamientoId",
      "equipos",
      "adjuntos",
    ];

    const camposInvalidos = Object.keys(data).filter(
      (campo) => !camposOTPermitidos.includes(campo)
    );

    if (camposInvalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Se enviaron campos no permitidos",
        camposInvalidos,
      });
    }

    if (
      data.numeroOT !== undefined &&
      (typeof data.numeroOT !== "string" || !data.numeroOT.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "numeroOT debe ser un texto no vacío",
      });
    }

    if (
      data.tipoMantenimiento !== undefined &&
      !["Preventivo", "Correctivo", "Mejora", "Predictivo"].includes(
        data.tipoMantenimiento
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "tipoMantenimiento no es válido",
      });
    }

    if (
      data.estado !== undefined &&
      !["CREADO", "LIBERADO", "CIERRE_TECNICO", "CERRADO", "CANCELADO"].includes(
        data.estado
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "estado no es válido",
      });
    }

    if (data.equipos !== undefined && !Array.isArray(data.equipos)) {
      return res.status(400).json({
        success: false,
        message: "equipos debe ser un array",
      });
    }

    if (data.adjuntos !== undefined && !Array.isArray(data.adjuntos)) {
      return res.status(400).json({
        success: false,
        message: "adjuntos debe ser un array",
      });
    }

    if (Array.isArray(data.equipos)) {
      for (const [index, equipo] of data.equipos.entries()) {
        const tieneEquipoId = !!equipo.equipoId;
        const tieneUbicacionTecnicaId = !!equipo.ubicacionTecnicaId;

        if (
          (tieneEquipoId && tieneUbicacionTecnicaId) ||
          (!tieneEquipoId && !tieneUbicacionTecnicaId)
        ) {
          return res.status(400).json({
            success: false,
            message: `El equipo en la posición ${index} debe tener solo equipoId o solo ubicacionTecnicaId`,
          });
        }

        if (
          equipo.prioridad !== undefined &&
          !["BAJA", "MEDIA", "ALTA", "CRITICA"].includes(equipo.prioridad)
        ) {
          return res.status(400).json({
            success: false,
            message: `prioridad no válida en equipo posición ${index}`,
          });
        }

        if (
          equipo.estadoEquipo !== undefined &&
          !["PENDIENTE", "EN_PROCESO", "FINALIZADO", "CANCELADO"].includes(
            equipo.estadoEquipo
          )
        ) {
          return res.status(400).json({
            success: false,
            message: `estadoEquipo no válido en equipo posición ${index}`,
          });
        }

        if (
          equipo.trabajadores !== undefined &&
          !Array.isArray(equipo.trabajadores)
        ) {
          return res.status(400).json({
            success: false,
            message: `trabajadores debe ser array en equipo posición ${index}`,
          });
        }

        if (
          equipo.actividades !== undefined &&
          !Array.isArray(equipo.actividades)
        ) {
          return res.status(400).json({
            success: false,
            message: `actividades debe ser array en equipo posición ${index}`,
          });
        }

        if (equipo.adjuntos !== undefined && !Array.isArray(equipo.adjuntos)) {
          return res.status(400).json({
            success: false,
            message: `adjuntos debe ser array en equipo posición ${index}`,
          });
        }

        if (Array.isArray(equipo.trabajadores)) {
          const encargados = equipo.trabajadores.filter((t) => t.esEncargado === true);

          if (encargados.length > 1) {
            return res.status(400).json({
              success: false,
              message: `Solo puede haber un encargado por equipo. Error en equipo posición ${index}`,
            });
          }

          for (const [tIndex, trabajador] of equipo.trabajadores.entries()) {
            if (!trabajador.trabajadorId || typeof trabajador.trabajadorId !== "string") {
              return res.status(400).json({
                success: false,
                message: `trabajadorId es requerido en trabajador posición ${tIndex} del equipo ${index}`,
              });
            }
          }
        }

        if (Array.isArray(equipo.actividades)) {
          for (const [aIndex, actividad] of equipo.actividades.entries()) {
            if (!actividad.tarea || typeof actividad.tarea !== "string") {
              return res.status(400).json({
                success: false,
                message: `tarea es requerida en actividad posición ${aIndex} del equipo ${index}`,
              });
            }

            if (
              actividad.tipoTrabajo !== undefined &&
              ![
                "TORQUEO_REGULACION",
                "APLICACION",
                "REVISION",
                "INSPECCION",
                "CAMBIO",
                "LIMPIEZA",
                "AJUSTE",
                "LUBRICACION",
                "REPARACION",
              ].includes(actividad.tipoTrabajo)
            ) {
              return res.status(400).json({
                success: false,
                message: `tipoTrabajo no válido en actividad posición ${aIndex} del equipo ${index}`,
              });
            }

            if (
              actividad.estado !== undefined &&
              !["PENDIENTE", "EN_PROCESO", "COMPLETADA", "OMITIDA"].includes(
                actividad.estado
              )
            ) {
              return res.status(400).json({
                success: false,
                message: `estado no válido en actividad posición ${aIndex} del equipo ${index}`,
              });
            }

            if (
              actividad.origen !== undefined &&
              !["PLAN", "MANUAL", "TRATAMIENTO"].includes(actividad.origen)
            ) {
              return res.status(400).json({
                success: false,
                message: `origen no válido en actividad posición ${aIndex} del equipo ${index}`,
              });
            }

            if (
              actividad.unidadDuracion !== undefined &&
              !["min", "h"].includes(actividad.unidadDuracion)
            ) {
              return res.status(400).json({
                success: false,
                message: `unidadDuracion no válida en actividad posición ${aIndex} del equipo ${index}`,
              });
            }

            if (
              actividad.unidadDuracionReal !== undefined &&
              !["min", "h"].includes(actividad.unidadDuracionReal)
            ) {
              return res.status(400).json({
                success: false,
                message: `unidadDuracionReal no válida en actividad posición ${aIndex} del equipo ${index}`,
              });
            }
          }
        }
      }
    }

    const otActualizada =
      await ordenTrabajoController.actualizarOrdenTrabajoCompleta(id, data);

    if (!otActualizada) {
      return res.status(404).json({
        success: false,
        message: "Orden de trabajo no encontrada",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Orden de trabajo actualizada correctamente",
      data: otActualizada,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZAR ORDEN TRABAJO COMPLETA:", error);

    return res.status(500).json({
      success: false,
      message: "Error al actualizar la orden de trabajo completa",
      error: error.message,
    });
  }
}

/* =========================
   DELETE
========================= */
async function eliminarOrdenTrabajoHandler(req, res) {
  try {
    const eliminado = await ordenTrabajoController.eliminarOrdenTrabajo(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ message: "OT no encontrada" });
    }

    res.json({ message: "OT eliminada correctamente" });
  } catch (error) {
    console.error("ERROR DELETE OT:", error);
    res.status(500).json({ message: "Error al eliminar OT" });
  }
}

const liberarOrdenTrabajo = async (req, res) => {
  try {
    const { id } = req.params;

    const ot = await ordenTrabajoController.liberarOrdenTrabajo(id);

    res.json({
      message: "Orden de Trabajo liberada correctamente",
      data: ot,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "El id de la orden de trabajo es requerido",
      });
    }

    const data = await getDetalleSolicitudesTratamientoPorOrdenTrabajo(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error al obtener solicitudes del tratamiento por OT:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error interno del servidor",
    });
  }
};


/* =========================
   EXPORTS
========================= */
module.exports = {
  crearOrdenTrabajoHandler,
  obtenerOrdenesTrabajoHandler,
  obtenerOrdenTrabajoPorIdHandler,
  actualizarOrdenTrabajoCompletaHandler,
  eliminarOrdenTrabajoHandler,
  liberarOrdenTrabajo,
  getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler
};