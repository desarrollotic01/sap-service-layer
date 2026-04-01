const ordenTrabajoController = require("../controllers/ordenTrabajoController");
const {  getDetalleSolicitudesTratamientoPorOrdenTrabajo,
} = require("../controllers/ordenTrabajoDetalleController");



async function obtenerSolicitudesPorOTHandler(req, res) {
  try {
    const { id } = req.params;

    const errors = [];

    if (!req.user?.id) {
      errors.push("Usuario no autenticado");
    }

    if (!id) {
      errors.push("ordenTrabajoId es obligatorio");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const solicitudes =
      await ordenTrabajoController.obtenerSolicitudesPorOT(id);

    return res.json(solicitudes);
  } catch (error) {
    console.error("ERROR GET SOLICITUDES OT:", error);

    return res.status(500).json({
      errors: ["Error al obtener solicitudes de la OT"],
    });
  }
}

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
      grupalTargetKeys = [],
      individualTargetKeys = [],
      solicitudGeneralStrategy = "OT_GRUPAL", // NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA
      otKeyGeneral = null,
      tipoMantenimiento,
      numeroOT,
      descripcionGeneral,
      estado,
      supervisorId,
      solicitudesCompra,   // 👈 nuevo — puede venir null si no hay
      solicitudesAlmacen,
      fechaProgramadaInicio,
      fechaProgramadaFin,
      fechaInicioReal,
      fechaFinReal,
      fechaCierre,
      observaciones,
      tratamientoId,
      adjuntos,
    } = req.body || {};

    /* =========================
       VALIDACIONES GENERALES
    ========================= */
    if (!avisoId) {
      errors.push("avisoId es requerido");
    }

    if (!Array.isArray(equipos) || equipos.length === 0) {
      errors.push("Debe incluir al menos un equipo o ubicación técnica");
    }

    if (modo && !["GRUPAL", "INDIVIDUAL", "MIXTO"].includes(modo)) {
      errors.push("modo inválido. Use GRUPAL | INDIVIDUAL | MIXTO");
    }

    if (
      solicitudGeneralStrategy &&
      !["NINGUNA", "OT_GRUPAL", "PRIMERA_OT", "OT_ESPECIFICA"].includes(
        solicitudGeneralStrategy
      )
    ) {
      errors.push(
        "solicitudGeneralStrategy inválida. Use NINGUNA | OT_GRUPAL | PRIMERA_OT | OT_ESPECIFICA"
      );
    }

    if (
      tipoMantenimiento !== undefined &&
      !["Preventivo", "Correctivo", "Mejora", "Predictivo"].includes(
        tipoMantenimiento
      )
    ) {
      errors.push("tipoMantenimiento no es válido");
    }

    if (
      estado !== undefined &&
      !["CREADO", "LIBERADO", "CIERRE_TECNICO", "CERRADO", "CANCELADO"].includes(
        estado
      )
    ) {
      errors.push("estado no es válido");
    }

    if (
      numeroOT !== undefined &&
      (typeof numeroOT !== "string" || !numeroOT.trim())
    ) {
      errors.push("numeroOT debe ser un texto válido");
    }

    if (
      descripcionGeneral !== undefined &&
      typeof descripcionGeneral !== "string"
    ) {
      errors.push("descripcionGeneral debe ser texto");
    }

    if (adjuntos !== undefined && !Array.isArray(adjuntos)) {
      errors.push("adjuntos debe ser un array");
    }

    /* =========================
       VALIDACIÓN OT GENERAL ESTRATEGIA
    ========================= */
    if (solicitudGeneralStrategy === "OT_ESPECIFICA") {
      if (!otKeyGeneral) {
        errors.push(
          "otKeyGeneral es requerido cuando solicitudGeneralStrategy=OT_ESPECIFICA"
        );
      } else {
        const ok =
          otKeyGeneral === "GRUPAL" ||
          /^E:.+$/i.test(String(otKeyGeneral)) ||
          /^U:.+$/i.test(String(otKeyGeneral));

        if (!ok) {
          errors.push(
            'otKeyGeneral inválido. Use "GRUPAL", "E:<uuid>" o "U:<uuid>"'
          );
        }
      }
    }

    /* =========================
       VALIDACIÓN MODO MIXTO
    ========================= */
    if (modo === "MIXTO") {
      if (!Array.isArray(grupalTargetKeys) || grupalTargetKeys.length === 0) {
        errors.push("En MIXTO debe enviar grupalTargetKeys");
      }

      if (
        !Array.isArray(individualTargetKeys) ||
        individualTargetKeys.length === 0
      ) {
        errors.push("En MIXTO debe enviar individualTargetKeys");
      }

      if (
        Array.isArray(grupalTargetKeys) &&
        Array.isArray(individualTargetKeys)
      ) {
        const set = new Set([...grupalTargetKeys, ...individualTargetKeys]);
        if (set.size !== grupalTargetKeys.length + individualTargetKeys.length) {
          errors.push("Un target no puede estar en grupal e individual a la vez");
        }
      }
    }

    /* =========================
       VALIDACIÓN DE EQUIPOS
    ========================= */
    if (Array.isArray(equipos)) {
      for (const [index, equipo] of equipos.entries()) {
        const tieneEquipoId = !!equipo.equipoId;
        const tieneUbicacionTecnicaId = !!equipo.ubicacionTecnicaId;

        if (
          (tieneEquipoId && tieneUbicacionTecnicaId) ||
          (!tieneEquipoId && !tieneUbicacionTecnicaId)
        ) {
          errors.push(
            `El equipo en la posición ${index} debe tener solo equipoId o solo ubicacionTecnicaId`
          );
        }

        if (
          equipo.prioridad !== undefined &&
          !["BAJA", "MEDIA", "ALTA", "CRITICA"].includes(equipo.prioridad)
        ) {
          errors.push(`prioridad no válida en equipo posición ${index}`);
        }

        if (
          equipo.estadoEquipo !== undefined &&
          !["PENDIENTE", "EN_PROCESO", "FINALIZADO", "CANCELADO"].includes(
            equipo.estadoEquipo
          )
        ) {
          errors.push(`estadoEquipo no válido en equipo posición ${index}`);
        }

        if (
          equipo.trabajadores !== undefined &&
          !Array.isArray(equipo.trabajadores)
        ) {
          errors.push(`trabajadores debe ser array en equipo posición ${index}`);
        }

        if (
          equipo.actividades !== undefined &&
          !Array.isArray(equipo.actividades)
        ) {
          errors.push(`actividades debe ser array en equipo posición ${index}`);
        }

        if (equipo.adjuntos !== undefined && !Array.isArray(equipo.adjuntos)) {
          errors.push(`adjuntos debe ser array en equipo posición ${index}`);
        }

        if (Array.isArray(equipo.trabajadores)) {
          const encargados = equipo.trabajadores.filter(
            (t) => t.esEncargado === true
          );

          if (encargados.length > 1) {
            errors.push(
              `Solo puede haber un encargado por equipo. Error en equipo posición ${index}`
            );
          }

          for (const [tIndex, trabajador] of equipo.trabajadores.entries()) {
            if (
              !trabajador.trabajadorId ||
              typeof trabajador.trabajadorId !== "string"
            ) {
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
              errors.push(
                `tipoTrabajo no válido en actividad posición ${aIndex} del equipo ${index}`
              );
            }

            if (
              actividad.estado !== undefined &&
              !["PENDIENTE", "EN_PROCESO", "COMPLETADA", "OMITIDA"].includes(
                actividad.estado
              )
            ) {
              errors.push(
                `estado no válido en actividad posición ${aIndex} del equipo ${index}`
              );
            }

            if (
              actividad.origen !== undefined &&
              !["PLAN", "MANUAL", "TRATAMIENTO"].includes(actividad.origen)
            ) {
              errors.push(
                `origen no válido en actividad posición ${aIndex} del equipo ${index}`
              );
            }

            if (
              actividad.unidadDuracion !== undefined &&
              !["min", "h"].includes(actividad.unidadDuracion)
            ) {
              errors.push(
                `unidadDuracion no válida en actividad posición ${aIndex} del equipo ${index}`
              );
            }

            if (
              actividad.unidadDuracionReal !== undefined &&
              !["min", "h"].includes(actividad.unidadDuracionReal)
            ) {
              errors.push(
                `unidadDuracionReal no válida en actividad posición ${aIndex} del equipo ${index}`
              );
            }

            if (
              actividad.cantidadTecnicos !== undefined &&
              (isNaN(Number(actividad.cantidadTecnicos)) ||
                Number(actividad.cantidadTecnicos) < 1)
            ) {
              errors.push(
                `cantidadTecnicos no válida en actividad posición ${aIndex} del equipo ${index}`
              );
            }
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

const syncSAPOrdenTrabajoHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ordenTrabajoController.syncSolicitudesCompraOT(id);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// En ordenTrabajoHandler.js

const previewSolicitudesHandler = async (req, res) => {
  try {
    const data = await ordenTrabajoController.previewSolicitudesOT(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const generarSolicitudCompraHandler = async (req, res) => {
  try {
    const solicitud = await ordenTrabajoController.generarSolicitudCompraOT(req.params.id);
    res.json({ success: true, data: solicitud });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const generarSolicitudAlmacenHandler = async (req, res) => {
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
  getDetalleSolicitudesTratamientoPorOrdenTrabajoHandler,
  syncSAPOrdenTrabajoHandler,
  obtenerSolicitudesPorOTHandler,
  previewSolicitudesHandler,
  generarSolicitudCompraHandler,
  generarSolicitudAlmacenHandler,
};