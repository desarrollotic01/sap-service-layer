const { Op } = require("sequelize");
const { sequelize, Equipo,PlanMantenimiento,GuiaMantenimientoProgramacion} = require("../db_connection");

const {
  CreateGuiaMantenimiento,
  CreateAdjuntosGuiaMantenimiento,
  GetAllGuiaMantenimiento,
  GetGuiaMantenimientoById,
  UpdateGuiaMantenimiento,
  DeleteGuiaMantenimiento,
  DeleteAdjuntoGuiaMantenimiento,
} = require("../controllers/guiaMantenimientoController");


const {AddFrequency, AddPeriodoGuia} = require("../utils/guiaMantenimientoFechas");

const isUUID = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const PERIODOS = new Set([
  "DIARIO",
  "SEMANAL",
  "MENSUAL",
  "BIMESTRAL",
  "TRIMESTRAL",
  "SEIS_MESES",
  "ANUAL",
  "CINCO_ANIOS",
  "DIEZ_ANIOS",
]);

// ✅ Tu Equipo maneja A/B/C, por eso la Guía debe guardar A/B/C en "creticidad"
const creticidad_VALID = new Set(["A", "B", "C"]);

const ValidateAdjuntos = (adjuntos) => {
  if (adjuntos === undefined) return;
  if (!Array.isArray(adjuntos)) throw new Error("adjuntos debe ser un arreglo.");

  for (const a of adjuntos) {
    if (!a || typeof a !== "object") throw new Error("Cada adjunto debe ser un objeto.");
    if (!a.nombre || typeof a.nombre !== "string" || !a.nombre.trim())
      throw new Error("Adjunto.nombre es obligatorio.");
    if (!a.url || typeof a.url !== "string" || !a.url.trim())
      throw new Error("Adjunto.url es obligatorio.");
    if (a.mime !== undefined && a.mime !== null && typeof a.mime !== "string")
      throw new Error("Adjunto.mime debe ser string.");
    if (a.size !== undefined && a.size !== null && typeof a.size !== "number")
      throw new Error("Adjunto.size debe ser number.");
  }
};

// ✅ para validar DateTime
const toDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

// Formato: 578465AL001
const BuildNumeroAlerta = async ({ ordenVenta, t }) => {
  const { GuiaMantenimiento } = sequelize.models;

  const last = await GuiaMantenimiento.findOne({
    where: {
      ordenVenta,
      numeroAlerta: { [Op.like]: `${ordenVenta}AL%` },
    },
    order: [["createdAt", "DESC"]],
    transaction: t,
  });

  let nextN = 1;
  if (last?.numeroAlerta) {
    const m = String(last.numeroAlerta).match(/AL(\d{3,})$/);
    if (m) nextN = parseInt(m[1], 10) + 1;
  }

  return `${ordenVenta}AL${String(nextN).padStart(3, "0")}`;
};

const ValidatePlanBelongsToEquipo = async ({ equipo, planMantenimientoId, t }) => {
  const planes = await equipo.getPlanesMantenimiento({
    where: { id: planMantenimientoId },
    transaction: t,
  });

  if (!planes || planes.length === 0) {
    throw new Error("El plan de mantenimiento no pertenece a este equipo.");
  }
};

// =======================
// CREATE
// =======================
const CreateGuiaMantenimientoHandler = async (req, res) => {
  try {
    const {
      equipoId,
      ubicacionTecnicaId,
      planMantenimientoId,
      periodo,
      periodoActivo,
      ordenVenta,
      paisId,

      // ✅ ahora debe ser datetime con hora
      fechaInicioAlerta,

      solicitanteId,
      descripcion,
      descripcionDetallada,

      // si NO hay equipo:
      creticidad,
      producto,
      adjuntos,
    } = req.body;

    // XOR equipo/ubicacionTecnica
    const hasEquipo = !!equipoId;
    const hasUbic = !!ubicacionTecnicaId;

    if (!hasEquipo && !hasUbic) return res.status(400).json({ error: "Debes enviar equipoId o ubicacionTecnicaId." });
    if (hasEquipo && hasUbic) return res.status(400).json({ error: "Solo envía equipoId o ubicacionTecnicaId, no ambos." });

    if (equipoId && !isUUID(equipoId)) return res.status(400).json({ error: "equipoId inválido." });
    if (ubicacionTecnicaId && !isUUID(ubicacionTecnicaId)) return res.status(400).json({ error: "ubicacionTecnicaId inválido." });

    if (!planMantenimientoId || !isUUID(planMantenimientoId))
      return res.status(400).json({ error: "planMantenimientoId es obligatorio y debe ser UUID." });

    if (!periodo || !PERIODOS.has(periodo))
      return res.status(400).json({ error: "periodo inválido." });

    if (periodoActivo !== undefined && typeof periodoActivo !== "boolean")
      return res.status(400).json({ error: "periodoActivo debe ser boolean." });

    // ✅ fechaInicioAlerta debe ser DateTime válido
    const fechaInicioDate = toDate(fechaInicioAlerta);
    if (!fechaInicioAlerta || !fechaInicioDate)
      return res.status(400).json({ error: "fechaInicioAlerta es obligatorio y debe ser DateTime válido (ej: 2026-03-02T11:42:00)." });

    if (!solicitanteId || !isUUID(solicitanteId))
      return res.status(400).json({ error: "solicitanteId es obligatorio y debe ser UUID." });

    if (!descripcion || typeof descripcion !== "string" || !descripcion.trim())
      return res.status(400).json({ error: "descripcion es obligatoria." });

    if (descripcionDetallada !== undefined && descripcionDetallada !== null && typeof descripcionDetallada !== "string")
      return res.status(400).json({ error: "descripcionDetallada debe ser string." });

    // Adjuntos
    ValidateAdjuntos(adjuntos);

    // Si NO hay equipo, obligamos creticidad/producto/ordenVenta/paisId
    if (!hasEquipo) {
      if (!creticidad || typeof creticidad !== "string" || !creticidad_VALID.has(creticidad))
        return res.status(400).json({ error: "creticidad es obligatoria si no envías equipoId y debe ser A/B/C." });

      if (!producto || typeof producto !== "string" || !producto.trim())
        return res.status(400).json({ error: "producto es obligatorio si no envías equipoId." });

      if (!ordenVenta || typeof ordenVenta !== "string" || !ordenVenta.trim())
        return res.status(400).json({ error: "ordenVenta es obligatoria si no envías equipoId." });

      if (!paisId || !isUUID(paisId))
        return res.status(400).json({ error: "paisId es obligatorio si no envías equipoId y debe ser UUID." });
    }

    const result = await sequelize.transaction(async (t) => {
      // Autocompletar desde equipo si aplica
      let ordenVentaFinal = ordenVenta ? String(ordenVenta).trim() : null;
      let paisIdFinal = paisId || null;
      let creticidadFinal = creticidad || null;
      let productoFinal = producto ? String(producto).trim() : null;

      if (hasEquipo) {
        const equipo = await Equipo.findByPk(equipoId, { transaction: t });
        if (!equipo) throw new Error("Equipo no existe.");

        await ValidatePlanBelongsToEquipo({ equipo, planMantenimientoId, t });

        if (!ordenVentaFinal) ordenVentaFinal = equipo.numeroOV;
        if (!paisIdFinal) paisIdFinal = equipo.paisId;

        // ✅ Equipo tiene "creticidad" (A/B/C)
        creticidadFinal = equipo.creticidad;
        productoFinal = equipo.nombre;

        if (!ordenVentaFinal) throw new Error("El equipo no tiene numeroOV.");
        if (!paisIdFinal) throw new Error("El equipo no tiene paisId.");
        if (!creticidadFinal) throw new Error("El equipo no tiene creticidad.");
        if (!productoFinal) throw new Error("El equipo no tiene nombre.");
      }

      // Generar numeroAlerta
      const numeroAlerta = await BuildNumeroAlerta({ ordenVenta: ordenVentaFinal, t });

      // Crear guía
      const guia = await CreateGuiaMantenimiento(
        {
          tipoMantenimiento: "Preventivo",
          equipoId: hasEquipo ? equipoId : null,
          ubicacionTecnicaId: hasUbic ? ubicacionTecnicaId : null,
          planMantenimientoId,
          periodo,
          periodoActivo: periodoActivo ?? true,
          ordenVenta: ordenVentaFinal,
          numeroAlerta,
          paisId: paisIdFinal,

          // ✅ OJO: en tu modelo Guía es "creticidad"
          creticidad: creticidadFinal,

          // ✅ guardamos Date con hora
          fechaInicioAlerta: fechaInicioDate,

          solicitanteId,
          producto: productoFinal,
          descripcion: descripcion.trim(),
          descripcionDetallada: descripcionDetallada ?? null,
          state: true,
        },
        t
      );

      // Crear adjuntos
      const adjuntosCreated = await CreateAdjuntosGuiaMantenimiento(guia.id, adjuntos, t);

      // ===========================
      // ✅ CREAR PRIMERA PROGRAMACIÓN
      // ===========================
      const plan = await PlanMantenimiento.findByPk(planMantenimientoId, { transaction: t });
      if (!plan) throw new Error("PlanMantenimiento no existe.");

      const fechaFinGuia = AddPeriodoGuia(guia.fechaInicioAlerta, guia.periodo);
      const primeraFecha = AddFrequency(guia.fechaInicioAlerta, plan.frecuencia, plan.frecuenciaHoras);

      if (primeraFecha > fechaFinGuia) {
        throw new Error("La guía no puede generar programaciones dentro del periodo (frecuencia supera la duración del periodo).");
      }

      const primeraProgramacion = await GuiaMantenimientoProgramacion.create(
        {
          guiaMantenimientoId: guia.id,
          fechaProgramada: primeraFecha,
          estado: "PENDIENTE",
          usuarioIdAccion: solicitanteId,
          state: true,
        },
        { transaction: t }
      );

      return { guia, adjuntos: adjuntosCreated, primeraProgramacion };
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// =======================
// GET ALL
// =======================
const GetAllGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { search, periodo, paisId, equipoId, planMantenimientoId } = req.query;

    const where = { state: true };

    if (periodo !== undefined) {
      if (!PERIODOS.has(periodo)) return res.status(400).json({ error: "periodo inválido." });
      where.periodo = periodo;
    }

    if (paisId !== undefined) {
      if (!isUUID(paisId)) return res.status(400).json({ error: "paisId inválido." });
      where.paisId = paisId;
    }

    if (equipoId !== undefined) {
      if (!isUUID(equipoId)) return res.status(400).json({ error: "equipoId inválido." });
      where.equipoId = equipoId;
    }

    if (planMantenimientoId !== undefined) {
      if (!isUUID(planMantenimientoId)) return res.status(400).json({ error: "planMantenimientoId inválido." });
      where.planMantenimientoId = planMantenimientoId;
    }

    if (search) {
      where[Op.or] = [
        { numeroAlerta: { [Op.iLike]: `%${search}%` } },
        { ordenVenta: { [Op.iLike]: `%${search}%` } },
        { descripcion: { [Op.iLike]: `%${search}%` } },
        { producto: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const guias = await GetAllGuiaMantenimiento(where);
    return res.status(200).json(guias);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// =======================
// GET BY ID
// =======================
const GetGuiaMantenimientoByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const guia = await GetGuiaMantenimientoById(id);
    if (!guia || guia.state === false) return res.status(404).json({ error: "Guía no encontrada." });

    const programaciones = Array.isArray(guia.programaciones) ? guia.programaciones : [];

    const proximaProgramacion =
      programaciones.find((p) => p.estado === "PENDIENTE" || p.estado === "VENCIDO") || null;

    const tieneVencidas = programaciones.some((p) => p.estado === "VENCIDO");

    return res.status(200).json({
      ...guia.toJSON(),
      proximaProgramacion,
      tieneVencidas,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// =======================
// UPDATE
// =======================
const UpdateGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const payload = { ...req.body };

    // 🔒 No editables
    if (payload.numeroAlerta !== undefined) delete payload.numeroAlerta;
    if (payload.tipoMantenimiento !== undefined) delete payload.tipoMantenimiento;
    if (payload.creticidad !== undefined) delete payload.creticidad;
    if (payload.producto !== undefined) delete payload.producto;
    if (payload.ordenVenta !== undefined) delete payload.ordenVenta;

    if (payload.periodo !== undefined && !PERIODOS.has(payload.periodo))
      return res.status(400).json({ error: "periodo inválido." });

    if (payload.periodoActivo !== undefined && typeof payload.periodoActivo !== "boolean")
      return res.status(400).json({ error: "periodoActivo debe ser boolean." });

    if (payload.fechaInicioAlerta !== undefined && typeof payload.fechaInicioAlerta !== "string")
      return res.status(400).json({ error: "fechaInicioAlerta debe ser string YYYY-MM-DD." });

    if (payload.descripcion !== undefined && (typeof payload.descripcion !== "string" || !payload.descripcion.trim()))
      return res.status(400).json({ error: "descripcion inválida." });

    if (payload.descripcionDetallada !== undefined && payload.descripcionDetallada !== null && typeof payload.descripcionDetallada !== "string")
      return res.status(400).json({ error: "descripcionDetallada inválida." });

    const updated = await sequelize.transaction(async (t) => {
      // si cambian equipo/plan => validación vínculo
      if (payload.equipoId && payload.planMantenimientoId) {
        if (!isUUID(payload.equipoId)) throw new Error("equipoId inválido.");
        if (!isUUID(payload.planMantenimientoId)) throw new Error("planMantenimientoId inválido.");

        const equipo = await Equipo.findByPk(payload.equipoId, { transaction: t });
        if (!equipo) throw new Error("Equipo no existe.");
        await ValidatePlanBelongsToEquipo({ equipo, planMantenimientoId: payload.planMantenimientoId, t });
      }

      const guia = await UpdateGuiaMantenimiento(id, payload, t);
      return guia;
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// =======================
// DELETE (state=false)
// =======================
const DeleteGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const result = await DeleteGuiaMantenimiento(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// =======================
// DELETE ADJUNTO (state=false)
// =======================
const DeleteAdjuntoGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { adjuntoId } = req.params;
    if (!isUUID(adjuntoId)) return res.status(400).json({ error: "adjuntoId inválido." });

    const result = await DeleteAdjuntoGuiaMantenimiento(adjuntoId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  CreateGuiaMantenimientoHandler,
  GetAllGuiaMantenimientoHandler,
  GetGuiaMantenimientoByIdHandler,
  UpdateGuiaMantenimientoHandler,
  DeleteGuiaMantenimientoHandler,
  DeleteAdjuntoGuiaMantenimientoHandler,
};