const avisosController = require("../controllers/avisosController");
const { validarAviso } = require("../validators/avisoValidator");
const path = require("path");

async function crearAvisoHandler(req, res) {
  try {
    const errors = [];

    if (!req.user?.id) {
      errors.push("Usuario no autenticado");
    }

    errors.push(...validarAviso(req.body));

    const { equipos = [], ubicaciones = [] } = req.body;

    if (equipos && !Array.isArray(equipos)) {
      errors.push("Equipos debe ser un arreglo");
    }

    if (ubicaciones && !Array.isArray(ubicaciones)) {
      errors.push("Ubicaciones debe ser un arreglo");
    }

    const tieneEquipos = equipos.length > 0;
    const tieneUbicaciones = ubicaciones.length > 0;

    if (!tieneEquipos && !tieneUbicaciones) {
      errors.push("Debe enviar equipos o ubicaciones técnicas");
    }

    if (tieneEquipos && tieneUbicaciones) {
      errors.push("No puede tener ambos");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    /* =========================
       🔥 PROCESAR ARCHIVOS
    ========================= */

    let documentos = [];
    let documentoFinal = null;

    // 🔹 múltiples documentos
    if (req.files?.documentos) {
      documentos = req.files.documentos.map(file => ({
        nombre: file.originalname,
        url: `/uploads/adjuntos/${file.filename}`,
        tipo: path.extname(file.originalname).replace(".", "")
      }));
    }

    // 🔹 documento final
    if (req.files?.documentoFinal) {
      const file = req.files.documentoFinal[0];
      documentoFinal = `/uploads/final/${file.filename}`;
    }

    /* =========================
       🔥 MERGE DATA
    ========================= */

    const dataFinal = {
      ...req.body,
      documentos,
      documentoFinal,
    };

    const aviso = await avisosController.crearAviso(
      dataFinal,
      req.user.id
    );

    return res.status(201).json(aviso);

  } catch (error) {
    console.error("ERROR CREAR AVISO:", error);

    return res.status(500).json({
      errors: ["Error interno al crear el aviso"],
    });
  }
}
  


async function obtenerAvisosHandler(req, res) {
  try {
    const avisos = await avisosController.obtenerAvisos();
    res.json(avisos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener avisos" });
  }
}

async function obtenerAvisoPorIdHandler(req, res) {
  try {
    const aviso = await avisosController.obtenerAvisoPorId(
      req.params.id
    );

    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json(aviso);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener aviso" });
  }
}

async function actualizarAvisoHandler(req, res) {
  try {
    const aviso = await avisosController.actualizarAviso(
      req.params.id,
      req.body
    );

    if (!aviso) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json(aviso);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar aviso" });
  }
}

async function eliminarAvisoHandler(req, res) {
  try {
    const eliminado = await avisosController.eliminarAviso(
      req.params.id
    );

    if (!eliminado) {
      return res.status(404).json({ message: "Aviso no encontrado" });
    }

    res.json({ message: "Aviso eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar aviso" });
  }
}

async function actualizarEstadoAvisoHandler(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const aviso = await avisosController.actualizarEstadoAviso(id, estado);

    res.json(aviso);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar estado" });
  }
}


const isValidUUID = (value) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(value));
};

const isValidDateOnly = (value) => {
  if (typeof value !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
};

const normalizarFiltrosAviso = (query) => {
  const filtros = {};

  if (query.estadoAviso !== undefined) {
    if (typeof query.estadoAviso !== "string" || !query.estadoAviso.trim()) {
      throw new Error("estadoAviso debe ser un texto válido.");
    }

    if (!ESTADOS_AVISO_VALIDOS.includes(query.estadoAviso.trim())) {
      throw new Error(
        `estadoAviso inválido. Valores permitidos: ${ESTADOS_AVISO_VALIDOS.join(", ")}.`
      );
    }

    filtros.estadoAviso = query.estadoAviso.trim();
  }

  if (query.tipoAviso !== undefined) {
    if (typeof query.tipoAviso !== "string" || !query.tipoAviso.trim()) {
      throw new Error("tipoAviso debe ser un texto válido.");
    }

    if (!TIPOS_AVISO_VALIDOS.includes(query.tipoAviso.trim())) {
      throw new Error(
        `tipoAviso inválido. Valores permitidos: ${TIPOS_AVISO_VALIDOS.join(", ")}.`
      );
    }

    filtros.tipoAviso = query.tipoAviso.trim();
  }

  if (query.prioridad !== undefined) {
    if (typeof query.prioridad !== "string" || !query.prioridad.trim()) {
      throw new Error("prioridad debe ser un texto válido.");
    }

    if (!PRIORIDADES_VALIDAS.includes(query.prioridad.trim())) {
      throw new Error(
        `prioridad inválida. Valores permitidos: ${PRIORIDADES_VALIDAS.join(", ")}.`
      );
    }

    filtros.prioridad = query.prioridad.trim();
  }

  if (query.tipoMantenimiento !== undefined) {
    if (
      typeof query.tipoMantenimiento !== "string" ||
      !query.tipoMantenimiento.trim()
    ) {
      throw new Error("tipoMantenimiento debe ser un texto válido.");
    }

    if (
      !TIPOS_MANTENIMIENTO_VALIDOS.includes(query.tipoMantenimiento.trim())
    ) {
      throw new Error(
        `tipoMantenimiento inválido. Valores permitidos: ${TIPOS_MANTENIMIENTO_VALIDOS.join(", ")}.`
      );
    }

    filtros.tipoMantenimiento = query.tipoMantenimiento.trim();
  }

  if (query.producto !== undefined) {
    if (typeof query.producto !== "string" || !query.producto.trim()) {
      throw new Error("producto debe ser un texto válido.");
    }

    if (!PRODUCTOS_VALIDOS.includes(query.producto.trim())) {
      throw new Error(
        `producto inválido. Valores permitidos: ${PRODUCTOS_VALIDOS.join(", ")}.`
      );
    }

    filtros.producto = query.producto.trim();
  }

  if (query.paisId !== undefined) {
    if (typeof query.paisId !== "string" || !query.paisId.trim()) {
      throw new Error("paisId debe ser un UUID válido.");
    }

    if (!isValidUUID(query.paisId.trim())) {
      throw new Error("paisId no tiene formato UUID válido.");
    }

    filtros.paisId = query.paisId.trim();
  }

  if (query.solicitanteId !== undefined) {
    if (
      typeof query.solicitanteId !== "string" ||
      !query.solicitanteId.trim()
    ) {
      throw new Error("solicitanteId debe ser un UUID válido.");
    }

    if (!isValidUUID(query.solicitanteId.trim())) {
      throw new Error("solicitanteId no tiene formato UUID válido.");
    }

    filtros.solicitanteId = query.solicitanteId.trim();
  }

  if (query.creadoPor !== undefined) {
    if (typeof query.creadoPor !== "string" || !query.creadoPor.trim()) {
      throw new Error("creadoPor debe ser un UUID válido.");
    }

    if (!isValidUUID(query.creadoPor.trim())) {
      throw new Error("creadoPor no tiene formato UUID válido.");
    }

    filtros.creadoPor = query.creadoPor.trim();
  }

  if (query.guiaMantenimientoId !== undefined) {
    if (
      typeof query.guiaMantenimientoId !== "string" ||
      !query.guiaMantenimientoId.trim()
    ) {
      throw new Error("guiaMantenimientoId debe ser un UUID válido.");
    }

    if (!isValidUUID(query.guiaMantenimientoId.trim())) {
      throw new Error("guiaMantenimientoId no tiene formato UUID válido.");
    }

    filtros.guiaMantenimientoId = query.guiaMantenimientoId.trim();
  }

  if (query.guiaMantenimientoProgramacionId !== undefined) {
    if (
      typeof query.guiaMantenimientoProgramacionId !== "string" ||
      !query.guiaMantenimientoProgramacionId.trim()
    ) {
      throw new Error(
        "guiaMantenimientoProgramacionId debe ser un UUID válido."
      );
    }

    if (!isValidUUID(query.guiaMantenimientoProgramacionId.trim())) {
      throw new Error(
        "guiaMantenimientoProgramacionId no tiene formato UUID válido."
      );
    }

    filtros.guiaMantenimientoProgramacionId =
      query.guiaMantenimientoProgramacionId.trim();
  }

  if (query.numeroAviso !== undefined) {
    if (typeof query.numeroAviso !== "string" || !query.numeroAviso.trim()) {
      throw new Error("numeroAviso debe ser un texto válido.");
    }

    filtros.numeroAviso = query.numeroAviso.trim();
  }

  if (query.descripcion !== undefined) {
    if (typeof query.descripcion !== "string" || !query.descripcion.trim()) {
      throw new Error("descripcion debe ser un texto válido.");
    }

    filtros.descripcion = query.descripcion.trim();
  }

  if (query.fechaDesde !== undefined) {
    if (!isValidDateOnly(query.fechaDesde)) {
      throw new Error(
        "fechaDesde debe tener formato válido YYYY-MM-DD."
      );
    }

    filtros.fechaDesde = query.fechaDesde;
  }

  if (query.fechaHasta !== undefined) {
    if (!isValidDateOnly(query.fechaHasta)) {
      throw new Error(
        "fechaHasta debe tener formato válido YYYY-MM-DD."
      );
    }

    filtros.fechaHasta = query.fechaHasta;
  }

  if (filtros.fechaDesde && filtros.fechaHasta) {
    const desde = new Date(`${filtros.fechaDesde}T00:00:00`);
    const hasta = new Date(`${filtros.fechaHasta}T00:00:00`);

    if (desde > hasta) {
      throw new Error("fechaDesde no puede ser mayor que fechaHasta.");
    }
  }

  return filtros;
};

const getAvisosManualHandler = async (req, res) => {
  try {
    const filtros = normalizarFiltrosAviso(req.query);

    const avisos = await avisosController.getAvisosManualController(filtros);

    return res.status(200).json({
      message: "Avisos manuales obtenidos correctamente.",
      total: avisos.length,
      data: avisos,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Error al obtener avisos manuales.",
    });
  }
};

const getAvisosGuiaHandler = async (req, res) => {
  try {
    const filtros = normalizarFiltrosAviso(req.query);

    const avisos = await avisosController.getAvisosGuiaController(filtros);

    return res.status(200).json({
      message: "Avisos de guía obtenidos correctamente.",
      total: avisos.length,
      data: avisos,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Error al obtener avisos de guía.",
    });
  }
};
module.exports = {
  crearAvisoHandler,
  obtenerAvisosHandler,
  obtenerAvisoPorIdHandler,
  actualizarAvisoHandler,
  eliminarAvisoHandler,
  actualizarEstadoAvisoHandler,
   getAvisosManualHandler,
  getAvisosGuiaHandler,
};
