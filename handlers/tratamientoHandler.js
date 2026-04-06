const TratamientoController = require("../controllers/tratamientoController");

const esUUID = (valor) => {
  if (!valor || typeof valor !== "string") return false;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(valor);
};

const esFechaValida = (fecha) => {
  if (!fecha || typeof fecha !== "string") return false;
  const date = new Date(fecha);
  return !Number.isNaN(date.getTime());
};

const esObjetoPlano = (valor) => {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
};

const validarLineaSolicitud = (linea, index, nombreSolicitud) => {
  if (!esObjetoPlano(linea)) {
    return `${nombreSolicitud}: la línea ${index + 1} debe ser un objeto válido`;
  }

  if (!linea.itemCode || typeof linea.itemCode !== "string" || !linea.itemCode.trim()) {
    return `${nombreSolicitud}: itemCode es obligatorio en la línea ${index + 1}`;
  }

  if (
    linea.quantity === undefined ||
    linea.quantity === null ||
    Number.isNaN(Number(linea.quantity)) ||
    Number(linea.quantity) <= 0
  ) {
    return `${nombreSolicitud}: quantity debe ser un número mayor a 0 en la línea ${index + 1}`;
  }

  if (
    linea.description !== undefined &&
    linea.description !== null &&
    typeof linea.description !== "string"
  ) {
    return `${nombreSolicitud}: description debe ser texto en la línea ${index + 1}`;
  }

  if (
    linea.warehouseCode !== undefined &&
    linea.warehouseCode !== null &&
    typeof linea.warehouseCode !== "string"
  ) {
    return `${nombreSolicitud}: warehouseCode debe ser texto en la línea ${index + 1}`;
  }

  if (
    linea.costCenter !== undefined &&
    linea.costCenter !== null &&
    typeof linea.costCenter !== "string"
  ) {
    return `${nombreSolicitud}: costCenter debe ser texto en la línea ${index + 1}`;
  }

  if (
    linea.costingCode !== undefined &&
    linea.costingCode !== null &&
    typeof linea.costingCode !== "string"
  ) {
    return `${nombreSolicitud}: costingCode debe ser texto en la línea ${index + 1}`;
  }

  if (
    linea.projectCode !== undefined &&
    linea.projectCode !== null &&
    typeof linea.projectCode !== "string"
  ) {
    return `${nombreSolicitud}: projectCode debe ser texto en la línea ${index + 1}`;
  }

  if (
    linea.rubroSapCode !== undefined &&
    linea.rubroSapCode !== null &&
    Number.isNaN(Number(linea.rubroSapCode))
  ) {
    return `${nombreSolicitud}: rubroSapCode debe ser numérico en la línea ${index + 1}`;
  }

  if (
    linea.paqueteTrabajo !== undefined &&
    linea.paqueteTrabajo !== null &&
    typeof linea.paqueteTrabajo !== "string"
  ) {
    return `${nombreSolicitud}: paqueteTrabajo debe ser texto en la línea ${index + 1}`;
  }

  return null;
};
const esLineaVacia = (linea) => {
  if (!linea || typeof linea !== "object" || Array.isArray(linea)) return true;

  const itemIdVacio =
    !linea.itemId || !String(linea.itemId).trim();

  const itemCodeVacio =
    !linea.itemCode || !String(linea.itemCode).trim();

  const descriptionVacia =
    !linea.description || !String(linea.description).trim();

  const costCenterVacio =
    !linea.costCenter || !String(linea.costCenter).trim();

  const costingCodeVacio =
    !linea.costingCode || !String(linea.costingCode).trim();

  const projectCodeVacio =
    !linea.projectCode || !String(linea.projectCode).trim();

  const rubroSapCodeVacio =
    linea.rubroSapCode === undefined ||
    linea.rubroSapCode === null ||
    String(linea.rubroSapCode).trim() === "";

  const paqueteTrabajoVacio =
    !linea.paqueteTrabajo || !String(linea.paqueteTrabajo).trim();

  const rubroVacio =
    !linea.rubro || !String(linea.rubro).trim();

  return (
    itemIdVacio &&
    itemCodeVacio &&
    descriptionVacia &&
    costCenterVacio &&
    costingCodeVacio &&
    projectCodeVacio &&
    rubroSapCodeVacio &&
    paqueteTrabajoVacio &&
    rubroVacio
  );
};
const esSolicitudVacia = (solicitud) => {
  if (!solicitud || typeof solicitud !== "object" || Array.isArray(solicitud)) {
    return true;
  }

  const requiredDateVacio =
    !solicitud.requiredDate || !String(solicitud.requiredDate).trim();



  const emailVacio =
    !solicitud.email || !String(solicitud.email).trim();



  const lineasVacias =
    !Array.isArray(solicitud.lineas) ||
    solicitud.lineas.length === 0 ||
    solicitud.lineas.every((l) => esLineaVacia(l));

  return (
    requiredDateVacio &&
  
    emailVacio &&
  
    lineasVacias
  );
};
const normalizarSolicitudOpcional = (solicitud) => {
  return esSolicitudVacia(solicitud) ? null : solicitud;
};

const normalizarSolicitudesPorTarget = (obj = {}) => {
  const resultado = {};

  if (!esObjetoPlano(obj)) return resultado;

  for (const key of Object.keys(obj)) {
    const solicitud = normalizarSolicitudOpcional(obj[key]);
    if (solicitud) {
      resultado[key] = solicitud;
    }
  }

  return resultado;
};

const validarSolicitud = (solicitud, nombreSolicitud) => {
  if (solicitud === undefined || solicitud === null) return null;

  if (!esObjetoPlano(solicitud)) {
    return `${nombreSolicitud} debe ser un objeto válido`;
  }

  if (!solicitud.requiredDate) {
    return `${nombreSolicitud}: requiredDate es obligatorio`;
  }

  if (!esFechaValida(solicitud.requiredDate)) {
    return `${nombreSolicitud}: requiredDate no tiene un formato de fecha válido`;
  }

  if (!Array.isArray(solicitud.lineas)) {
    return `${nombreSolicitud}: lineas debe ser un arreglo`;
  }

  if (solicitud.lineas.length === 0) {
    return `${nombreSolicitud}: debe tener al menos una línea`;
  }

  for (let i = 0; i < solicitud.lineas.length; i++) {
    const errorLinea = validarLineaSolicitud(
      solicitud.lineas[i],
      i,
      nombreSolicitud
    );
    if (errorLinea) return errorLinea;
  }

  return null;
};

const validarSolicitudesPorTarget = (obj, nombreBase) => {
  if (obj === undefined || obj === null) return null;

  if (!esObjetoPlano(obj)) {
    return `${nombreBase} debe ser un objeto válido`;
  }

  for (const key of Object.keys(obj)) {
    if (!key || typeof key !== "string") {
      return `${nombreBase}: la clave del target es inválida`;
    }

    const errorSolicitud = validarSolicitud(obj[key], `${nombreBase} (${key})`);
    if (errorSolicitud) return errorSolicitud;
  }

  return null;
};

const validarActividadManual = (actividad, index, targetKey) => {
  if (!esObjetoPlano(actividad)) {
    return `La actividad manual ${index + 1} del target ${targetKey} debe ser un objeto válido`;
  }

  if (!actividad.tarea || typeof actividad.tarea !== "string" || !actividad.tarea.trim()) {
    return `La actividad manual ${index + 1} del target ${targetKey} debe tener una tarea válida`;
  }

  if (
    actividad.tipoTrabajo !== undefined &&
    actividad.tipoTrabajo !== null &&
    !["REPARACION", "CAMBIO"].includes(actividad.tipoTrabajo)
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} tiene un tipoTrabajo inválido`;
  }

  if (
    !actividad.rolTecnico ||
    typeof actividad.rolTecnico !== "string" ||
    !actividad.rolTecnico.trim()
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} debe tener rolTecnico`;
  }

  if (
    actividad.cantidadTecnicos === undefined ||
    actividad.cantidadTecnicos === null ||
    Number.isNaN(Number(actividad.cantidadTecnicos)) ||
    Number(actividad.cantidadTecnicos) <= 0
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} debe tener cantidadTecnicos mayor a 0`;
  }

  if (
    actividad.unidadDuracion !== undefined &&
    actividad.unidadDuracion !== null &&
    !["min", "h"].includes(actividad.unidadDuracion)
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} tiene unidadDuracion inválida`;
  }

  if (
    actividad.duracionEstimadaValor !== undefined &&
    actividad.duracionEstimadaValor !== null &&
    Number.isNaN(Number(actividad.duracionEstimadaValor))
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} tiene duracionEstimadaValor inválida`;
  }

  if (
    actividad.duracionEstimadaMin !== undefined &&
    actividad.duracionEstimadaMin !== null &&
    Number.isNaN(Number(actividad.duracionEstimadaMin))
  ) {
    return `La actividad manual ${index + 1} del target ${targetKey} tiene duracionEstimadaMin inválida`;
  }

  return null;
};

const crearTratamiento = async (req, res) => {
  try {
    const { avisoId } = req.params;
    const body = req.body;
    const usuarioId = req.user?.id;

    if (!avisoId) {
      return res.status(400).json({
        success: false,
        message: "avisoId es requerido",
      });
    }

    if (!esUUID(avisoId)) {
      return res.status(400).json({
        success: false,
        message: "avisoId debe ser un UUID válido",
      });
    }

    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      });
    }

    if (!esUUID(usuarioId)) {
      return res.status(400).json({
        success: false,
        message: "El id del usuario autenticado no es válido",
      });
    }

    if (!body || !esObjetoPlano(body)) {
      return res.status(400).json({
        success: false,
        message: "El body debe ser un objeto válido",
      });
    }

   const {
  tratamiento,
  solicitudCompraGeneral: rawSolicitudCompraGeneral,
  solicitudesCompraPorEquipo: rawSolicitudesCompraPorEquipo,
  solicitudAlmacenGeneral: rawSolicitudAlmacenGeneral,
  solicitudesAlmacenPorEquipo: rawSolicitudesAlmacenPorEquipo,
} = body;

const solicitudCompraGeneral = normalizarSolicitudOpcional(rawSolicitudCompraGeneral);
const solicitudesCompraPorEquipo = normalizarSolicitudesPorTarget(rawSolicitudesCompraPorEquipo);

const solicitudAlmacenGeneral = normalizarSolicitudOpcional(rawSolicitudAlmacenGeneral);
const solicitudesAlmacenPorEquipo = normalizarSolicitudesPorTarget(rawSolicitudesAlmacenPorEquipo);

    if (!tratamiento || !esObjetoPlano(tratamiento)) {
      return res.status(400).json({
        success: false,
        message: "tratamiento es obligatorio y debe ser un objeto válido",
      });
    }

    if (
      tratamiento.planesSeleccionados !== undefined &&
      tratamiento.planesSeleccionados !== null &&
      !esObjetoPlano(tratamiento.planesSeleccionados)
    ) {
      return res.status(400).json({
        success: false,
        message: "tratamiento.planesSeleccionados debe ser un objeto válido",
      });
    }

    if (
      tratamiento.actividadesManuales !== undefined &&
      tratamiento.actividadesManuales !== null &&
      !esObjetoPlano(tratamiento.actividadesManuales)
    ) {
      return res.status(400).json({
        success: false,
        message: "tratamiento.actividadesManuales debe ser un objeto válido",
      });
    }

    if (esObjetoPlano(tratamiento.planesSeleccionados)) {
      for (const key of Object.keys(tratamiento.planesSeleccionados)) {
        const planId = tratamiento.planesSeleccionados[key];

        if (!planId || typeof planId !== "string" || !planId.trim()) {
          return res.status(400).json({
            success: false,
            message: `tratamiento.planesSeleccionados (${key}) debe tener un id válido`,
          });
        }

        if (!esUUID(planId)) {
          return res.status(400).json({
            success: false,
            message: `tratamiento.planesSeleccionados (${key}) debe ser UUID válido`,
          });
        }
      }
    }

    if (esObjetoPlano(tratamiento.actividadesManuales)) {
      for (const key of Object.keys(tratamiento.actividadesManuales)) {
        const actividades = tratamiento.actividadesManuales[key];

        if (!Array.isArray(actividades)) {
          return res.status(400).json({
            success: false,
            message: `tratamiento.actividadesManuales (${key}) debe ser un arreglo`,
          });
        }

        for (let i = 0; i < actividades.length; i++) {
          const errorActividad = validarActividadManual(actividades[i], i, key);
          if (errorActividad) {
            return res.status(400).json({
              success: false,
              message: errorActividad,
            });
          }
        }
      }
    }

    if (
  tratamiento.actividadesPlanEditadas !== undefined &&
  tratamiento.actividadesPlanEditadas !== null &&
  !esObjetoPlano(tratamiento.actividadesPlanEditadas)
) {
  return res.status(400).json({
    success: false,
    message: "tratamiento.actividadesPlanEditadas debe ser un objeto válido",
  });
}

if (esObjetoPlano(tratamiento.actividadesPlanEditadas)) {
  for (const key of Object.keys(tratamiento.actividadesPlanEditadas)) {
    const actividades = tratamiento.actividadesPlanEditadas[key];

    if (!Array.isArray(actividades)) {
      return res.status(400).json({
        success: false,
        message: `tratamiento.actividadesPlanEditadas (${key}) debe ser un arreglo`,
      });
    }

    for (let i = 0; i < actividades.length; i++) {
      const act = actividades[i];

      if (!act || !esObjetoPlano(act)) {
        return res.status(400).json({
          success: false,
          message: `tratamiento.actividadesPlanEditadas (${key})[${i}] debe ser un objeto válido`,
        });
      }


      if (
        act.cantidadTecnicos !== undefined &&
        (!Number.isFinite(Number(act.cantidadTecnicos)) ||
          Number(act.cantidadTecnicos) <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `cantidadTecnicos inválido en tratamiento.actividadesPlanEditadas (${key})[${i}]`,
        });
      }

      if (
        act.duracionEstimadaValor !== undefined &&
        !Number.isFinite(Number(act.duracionEstimadaValor))
      ) {
        return res.status(400).json({
          success: false,
          message: `duracionEstimadaValor inválido en tratamiento.actividadesPlanEditadas (${key})[${i}]`,
        });
      }

      if (
        act.duracionEstimadaMin !== undefined &&
        !Number.isFinite(Number(act.duracionEstimadaMin))
      ) {
        return res.status(400).json({
          success: false,
          message: `duracionEstimadaMin inválido en tratamiento.actividadesPlanEditadas (${key})[${i}]`,
        });
      }

      if (
        act.unidadDuracion !== undefined &&
        act.unidadDuracion !== "min" &&
        act.unidadDuracion !== "h"
      ) {
        return res.status(400).json({
          success: false,
          message: `unidadDuracion inválida en tratamiento.actividadesPlanEditadas (${key})[${i}]`,
        });
      }

      if (
        act.observaciones !== undefined &&
        act.observaciones !== null &&
        typeof act.observaciones !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: `observaciones inválidas en tratamiento.actividadesPlanEditadas (${key})[${i}]`,
        });
      }
    }
  }
}

    const errorSolicitudCompraGeneral = validarSolicitud(
      solicitudCompraGeneral,
      "Solicitud de compra general"
    );
    if (errorSolicitudCompraGeneral) {
      return res.status(400).json({
        success: false,
        message: errorSolicitudCompraGeneral,
      });
    }

    const errorSolicitudesCompraPorEquipo = validarSolicitudesPorTarget(
      solicitudesCompraPorEquipo,
      "Solicitud de compra por equipo/ubicación"
    );
    if (errorSolicitudesCompraPorEquipo) {
      return res.status(400).json({
        success: false,
        message: errorSolicitudesCompraPorEquipo,
      });
    }

    const errorSolicitudAlmacenGeneral = validarSolicitud(
      solicitudAlmacenGeneral,
      "Solicitud de almacén general"
    );
    if (errorSolicitudAlmacenGeneral) {
      return res.status(400).json({
        success: false,
        message: errorSolicitudAlmacenGeneral,
      });
    }

    const errorSolicitudesAlmacenPorEquipo = validarSolicitudesPorTarget(
      solicitudesAlmacenPorEquipo,
      "Solicitud de almacén por equipo/ubicación"
    );
    if (errorSolicitudesAlmacenPorEquipo) {
      return res.status(400).json({
        success: false,
        message: errorSolicitudesAlmacenPorEquipo,
      });
    }

    const nuevoTratamiento = await TratamientoController.crearTratamiento({
  avisoId,
  body: {
    ...body,
    solicitudCompraGeneral,
    solicitudesCompraPorEquipo,
    solicitudAlmacenGeneral,
    solicitudesAlmacenPorEquipo,
  },
  usuarioId,
});

    return res.status(201).json({
      success: true,
      message: "Tratamiento creado correctamente",
      data: nuevoTratamiento,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Error al crear tratamiento",
    });
  }
};


const obtenerTratamiento = async (req, res) => {
  try {
    const result = await TratamientoController.obtenerTratamientoPorAviso(
      req.params.avisoId
    );

    if (!result) {
      return res.status(404).json({
        message: "Tratamiento no encontrado",
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const validarLineasSolicitud = (lineas, label) => {
  if (!Array.isArray(lineas)) throw new Error(`${label}: lineas debe ser un arreglo`);
  if (lineas.length === 0) throw new Error(`${label}: debe tener al menos una línea`);

  for (const [i, l] of lineas.entries()) {
    const n = i + 1;
    if (!l.itemCode && !l.description) {
      throw new Error(`${label} línea ${n}: itemCode o description obligatorio`);
    }
    const q = Number(l.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      throw new Error(`${label} línea ${n}: quantity debe ser > 0`);
    }
  }
};

const guardarCambiosTratamientoHandler = async (req, res) => {
  try {
    const { tratamientoId } = req.params;
    const usuarioId = req.user?.id || req.body?.usuarioId;

    if (!tratamientoId) return res.status(400).json({ message: "tratamientoId es obligatorio" });
    if (!isUuid(tratamientoId)) return res.status(400).json({ message: "tratamientoId inválido" });
    if (!usuarioId) return res.status(400).json({ message: "usuarioId es obligatorio" });

    const { actividades, solicitudGeneral, solicitudesPorEquipo } = req.body || {};

    // ✅ ACTIVIDADES (opcional, pero si viene, valida)
    if (actividades !== undefined) {
      if (!Array.isArray(actividades)) {
        return res.status(400).json({ message: "actividades debe ser un arreglo" });
      }

      for (const [i, a] of actividades.entries()) {
        if (!a?.id) return res.status(400).json({ message: `Actividad ${i + 1}: id obligatorio` });
        if (!isUuid(a.id)) return res.status(400).json({ message: `Actividad ${i + 1}: id inválido` });

        if (a.unidadDuracion && !["min", "h"].includes(a.unidadDuracion)) {
          return res.status(400).json({ message: `Actividad ${i + 1}: unidadDuracion inválida` });
        }

        if (a.duracionEstimadaValor !== undefined && a.duracionEstimadaValor !== null) {
          const v = Number(a.duracionEstimadaValor);
          if (!Number.isFinite(v) || v <= 0) {
            return res.status(400).json({ message: `Actividad ${i + 1}: duracionEstimadaValor debe ser > 0` });
          }
        }

        if (a.cantidadTecnicos !== undefined && a.cantidadTecnicos !== null) {
          const c = Number(a.cantidadTecnicos);
          if (!Number.isFinite(c) || c <= 0) {
            return res.status(400).json({ message: `Actividad ${i + 1}: cantidadTecnicos debe ser > 0` });
          }
        }

        if (a.estado && !["PENDIENTE", "LISTA", "OMITIDA"].includes(a.estado)) {
          return res.status(400).json({ message: `Actividad ${i + 1}: estado inválido` });
        }

        if (
          a.rolTecnico &&
          !["tecnico_electrico", "operario_de_mantenimiento", "tecnico_mecanico", "supervisor"].includes(a.rolTecnico)
        ) {
          return res.status(400).json({ message: `Actividad ${i + 1}: rolTecnico inválido` });
        }
      }
    }

    // ✅ SOLICITUDES POR EQUIPO (opcional)
    if (solicitudesPorEquipo !== undefined && solicitudesPorEquipo !== null) {
      if (typeof solicitudesPorEquipo !== "object") {
        throw new Error("solicitudesPorEquipo debe ser un objeto");
      }

      for (const [key, sol] of Object.entries(solicitudesPorEquipo)) {
        if (!sol) continue;
        validarLineasSolicitud(sol.lineas, `Solicitud Target ${key}`);
      }
    }

    const r = await TratamientoController.guardarCambiosTratamiento({
      tratamientoId,
      body: req.body,
      usuarioId,
    });

    return res.json(r);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};


const obtenerSolicitudesParaOTHandler = async (req, res) => {
  try {
    const { avisoId } = req.params;
    const resultado = await TratamientoController.obtenerSolicitudesParaOT(avisoId);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  crearTratamiento,
  obtenerTratamiento,
  guardarCambiosTratamientoHandler,
  obtenerSolicitudesParaOTHandler,
};
