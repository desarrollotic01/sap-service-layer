const { Op } = require("sequelize");
const {
  sequelize,
  Equipo,
  UbicacionTecnica,
  PlanMantenimiento,
  GuiaMantenimiento,
  GuiaMantenimientoProgramacion,
} = require("../db_connection");

const {
  CreateGuiaMantenimiento,
  CreateAdjuntosGuiaMantenimiento,
  GetAllGuiaMantenimiento,
  GetGuiaMantenimientoById,
  UpdateGuiaMantenimiento,
  DeleteGuiaMantenimiento,
  DeleteAdjuntoGuiaMantenimiento,
} = require("../controllers/guiaMantenimientoController");

const { AddFrequency, AddPeriodoGuia } = require("../utils/guiaMantenimientoFechas");
const { SubtractAnticipacion } = require("../utils/guiaMantenimientoAlertas");

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

const CRETICIDAD_VALID = new Set(["A", "B", "C"]);
const TIPO_ANTICIPACION_VALID = new Set(["MINUTOS", "HORAS", "DIAS", "SEMANAS"]);

const PRODUCTOS_VALIDOS = new Set([
  "Racks",
  "Vehiculo",
  "Autosat",
  "Techo y Cerramiento",
  "Equipos Propios",
  "Sanitarias",
  "HVAC",
  "DACI",
  "ACI",
  "Datos y Comunicaciones",
  "Eléctrico",
  "Pisos y Estructuras",
]);

const ValidateAdjuntos = (adjuntos) => {
  if (adjuntos === undefined) return;
  if (!Array.isArray(adjuntos)) throw new Error("adjuntos debe ser un arreglo.");

  for (const a of adjuntos) {
    if (!a || typeof a !== "object") throw new Error("Cada adjunto debe ser un objeto.");
    if (!a.nombre || typeof a.nombre !== "string" || !a.nombre.trim()) {
      throw new Error("Adjunto.nombre es obligatorio.");
    }
    if (!a.url || typeof a.url !== "string" || !a.url.trim()) {
      throw new Error("Adjunto.url es obligatorio.");
    }
    if (a.mime !== undefined && a.mime !== null && typeof a.mime !== "string") {
      throw new Error("Adjunto.mime debe ser string.");
    }
    if (a.size !== undefined && a.size !== null && typeof a.size !== "number") {
      throw new Error("Adjunto.size debe ser number.");
    }
  }
};

const toDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

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

const ValidatePlanBelongsToUbicacion = async ({
  ubicacionTecnica,
  planMantenimientoId,
  t,
}) => {
  const planes = await ubicacionTecnica.getPlanesMantenimiento({
    where: { id: planMantenimientoId },
    transaction: t,
  });

  if (!planes || planes.length === 0) {
    throw new Error("El plan de mantenimiento no pertenece a esta ubicación técnica.");
  }
};

/* =======================
   CREATE
======================= */
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
      fechaInicioAlerta,
      solicitanteId,
      descripcion,
      descripcionDetallada,
      creticidad,
      producto,
      adjuntos,
      alertaActiva,
      tipoAnticipacionAlerta,
      valorAnticipacionAlerta,
    } = req.body;

    const hasEquipo = !!equipoId;
    const hasUbic = !!ubicacionTecnicaId;

    if (!hasEquipo && !hasUbic) {
      return res.status(400).json({ error: "Debes enviar equipoId o ubicacionTecnicaId." });
    }

    if (hasEquipo && hasUbic) {
      return res.status(400).json({
        error: "Solo envía equipoId o ubicacionTecnicaId, no ambos.",
      });
    }

    if (equipoId && !isUUID(equipoId)) {
      return res.status(400).json({ error: "equipoId inválido." });
    }

    if (ubicacionTecnicaId && !isUUID(ubicacionTecnicaId)) {
      return res.status(400).json({ error: "ubicacionTecnicaId inválido." });
    }

    if (!planMantenimientoId || !isUUID(planMantenimientoId)) {
      return res.status(400).json({
        error: "planMantenimientoId es obligatorio y debe ser UUID.",
      });
    }

    if (!periodo || !PERIODOS.has(periodo)) {
      return res.status(400).json({ error: "periodo inválido." });
    }

    if (periodoActivo !== undefined && typeof toBoolean(periodoActivo) !== "boolean") {
      return res.status(400).json({ error: "periodoActivo debe ser boolean." });
    }

    const fechaInicioDate = toDate(fechaInicioAlerta);
    if (!fechaInicioAlerta || !fechaInicioDate) {
      return res.status(400).json({
        error:
          "fechaInicioAlerta es obligatorio y debe ser DateTime válido (ej: 2026-03-02T11:42:00).",
      });
    }

    if (!solicitanteId || !isUUID(solicitanteId)) {
      return res.status(400).json({
        error: "solicitanteId es obligatorio y debe ser UUID.",
      });
    }

    if (!descripcion || typeof descripcion !== "string" || !descripcion.trim()) {
      return res.status(400).json({ error: "descripcion es obligatoria." });
    }

    if (
      descripcionDetallada !== undefined &&
      descripcionDetallada !== null &&
      typeof descripcionDetallada !== "string"
    ) {
      return res.status(400).json({ error: "descripcionDetallada debe ser string." });
    }

    ValidateAdjuntos(adjuntos);

    const alertaActivaFinal =
      alertaActiva === undefined ? true : toBoolean(alertaActiva);

    if (typeof alertaActivaFinal !== "boolean") {
      return res.status(400).json({ error: "alertaActiva debe ser boolean." });
    }

    if (alertaActivaFinal) {
      if (!tipoAnticipacionAlerta || !TIPO_ANTICIPACION_VALID.has(tipoAnticipacionAlerta)) {
        return res.status(400).json({
          error: "tipoAnticipacionAlerta inválido. Usa MINUTOS, HORAS, DIAS o SEMANAS.",
        });
      }

      const valorAnt = Number(valorAnticipacionAlerta);
      if (!Number.isFinite(valorAnt) || valorAnt <= 0) {
        return res.status(400).json({
          error: "valorAnticipacionAlerta debe ser un número mayor a 0.",
        });
      }
    }

    if (!hasEquipo) {
      if (!creticidad || typeof creticidad !== "string" || !CRETICIDAD_VALID.has(creticidad)) {
        return res.status(400).json({
          error: "creticidad es obligatoria si no envías equipoId y debe ser A/B/C.",
        });
      }

      if (!producto || typeof producto !== "string" || !PRODUCTOS_VALIDOS.has(producto)) {
        return res.status(400).json({
          error: "producto es obligatorio si no envías equipoId y debe ser válido.",
        });
      }

      if (!ordenVenta || typeof ordenVenta !== "string" || !ordenVenta.trim()) {
        return res.status(400).json({
          error: "ordenVenta es obligatoria si no envías equipoId.",
        });
      }

      if (!paisId || !isUUID(paisId)) {
        return res.status(400).json({
          error: "paisId es obligatorio si no envías equipoId y debe ser UUID.",
        });
      }
    }

    const result = await sequelize.transaction(async (t) => {
      let ordenVentaFinal = ordenVenta ? String(ordenVenta).trim() : null;
      let paisIdFinal = paisId || null;
      let creticidadFinal = creticidad || null;
      let productoFinal = producto ? String(producto).trim() : null;

      if (hasEquipo) {
        const equipo = await Equipo.findByPk(equipoId, { transaction: t });
        if (!equipo || equipo.state === false) throw new Error("Equipo no existe.");

        await ValidatePlanBelongsToEquipo({ equipo, planMantenimientoId, t });

        if (!ordenVentaFinal) ordenVentaFinal = equipo.numeroOV;
        if (!paisIdFinal) paisIdFinal = equipo.paisId;
        creticidadFinal = equipo.creticidad;
        productoFinal = equipo.producto || equipo.nombre;

        if (!ordenVentaFinal) throw new Error("El equipo no tiene numeroOV.");
        if (!paisIdFinal) throw new Error("El equipo no tiene paisId.");
        if (!creticidadFinal) throw new Error("El equipo no tiene creticidad.");
        if (!productoFinal) throw new Error("El equipo no tiene producto o nombre.");
      }

      if (hasUbic) {
        const ubicacion = await UbicacionTecnica.findByPk(ubicacionTecnicaId, {
          transaction: t,
        });

        if (!ubicacion || ubicacion.state === false) {
          throw new Error("Ubicación técnica no existe.");
        }

        await ValidatePlanBelongsToUbicacion({
          ubicacionTecnica: ubicacion,
          planMantenimientoId,
          t,
        });
      }

      const numeroAlerta = await BuildNumeroAlerta({
        ordenVenta: ordenVentaFinal,
        t,
      });

      const guia = await CreateGuiaMantenimiento(
        {
          tipoMantenimiento: "Preventivo",
          equipoId: hasEquipo ? equipoId : null,
          ubicacionTecnicaId: hasUbic ? ubicacionTecnicaId : null,
          planMantenimientoId,
          periodo,
          periodoActivo: toBoolean(periodoActivo) ?? true,
          ordenVenta: ordenVentaFinal,
          numeroAlerta,
          paisId: paisIdFinal,
          creticidad: creticidadFinal,
          fechaInicioAlerta: fechaInicioDate,
          solicitanteId,
          producto: productoFinal,
          descripcion: descripcion.trim(),
          descripcionDetallada: descripcionDetallada ?? null,
          alertaActiva: alertaActivaFinal,
          tipoAnticipacionAlerta: alertaActivaFinal ? tipoAnticipacionAlerta : null,
          valorAnticipacionAlerta: alertaActivaFinal
            ? Number(valorAnticipacionAlerta)
            : null,
          state: true,
        },
        t
      );

      const adjuntosCreated = await CreateAdjuntosGuiaMantenimiento(guia.id, adjuntos, t);

      const plan = await PlanMantenimiento.findByPk(planMantenimientoId, { transaction: t });
      if (!plan) throw new Error("PlanMantenimiento no existe.");

      const fechaFinGuia = AddPeriodoGuia(guia.fechaInicioAlerta, guia.periodo);
      const primeraFecha = AddFrequency(
        guia.fechaInicioAlerta,
        plan.frecuencia,
        plan.frecuenciaHoras
      );

      if (primeraFecha > fechaFinGuia) {
        throw new Error(
          "La guía no puede generar programaciones dentro del periodo (frecuencia supera la duración del periodo)."
        );
      }

      const fechaAlertaCalculada =
        guia.alertaActiva &&
        guia.tipoAnticipacionAlerta &&
        guia.valorAnticipacionAlerta
          ? SubtractAnticipacion(
              primeraFecha,
              guia.tipoAnticipacionAlerta,
              guia.valorAnticipacionAlerta
            )
          : null;

      const primeraProgramacion = await GuiaMantenimientoProgramacion.create(
        {
          guiaMantenimientoId: guia.id,
          fechaProgramada: primeraFecha,
          fechaAlertaCalculada,
          alertaDisparada: false,
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

/* =======================
   GET ALL
======================= */
const GetAllGuiaMantenimientoHandler = async (req, res) => {
  try {
    const {
      search,
      periodo,
      paisId,
      equipoId,
      ubicacionTecnicaId,
      planMantenimientoId,
    } = req.query;

    const where = { state: true };

    if (periodo !== undefined) {
      if (!PERIODOS.has(periodo)) {
        return res.status(400).json({ error: "periodo inválido." });
      }
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

    if (ubicacionTecnicaId !== undefined) {
      if (!isUUID(ubicacionTecnicaId)) {
        return res.status(400).json({ error: "ubicacionTecnicaId inválido." });
      }
      where.ubicacionTecnicaId = ubicacionTecnicaId;
    }

    if (planMantenimientoId !== undefined) {
      if (!isUUID(planMantenimientoId)) {
        return res.status(400).json({ error: "planMantenimientoId inválido." });
      }
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

/* =======================
   GET BY ID
======================= */
const GetGuiaMantenimientoByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const guia = await GetGuiaMantenimientoById(id);
    if (!guia || guia.state === false) {
      return res.status(404).json({ error: "Guía no encontrada." });
    }

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

/* =======================
   UPDATE
======================= */
const UpdateGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: "id inválido." });

    const payload = { ...req.body };

    if (payload.numeroAlerta !== undefined) delete payload.numeroAlerta;
    if (payload.tipoMantenimiento !== undefined) delete payload.tipoMantenimiento;
    if (payload.creticidad !== undefined) delete payload.creticidad;
    if (payload.producto !== undefined) delete payload.producto;
    if (payload.ordenVenta !== undefined) delete payload.ordenVenta;

    if (payload.periodo !== undefined && !PERIODOS.has(payload.periodo)) {
      return res.status(400).json({ error: "periodo inválido." });
    }

    if (payload.periodoActivo !== undefined) {
      payload.periodoActivo = toBoolean(payload.periodoActivo);
      if (typeof payload.periodoActivo !== "boolean") {
        return res.status(400).json({ error: "periodoActivo debe ser boolean." });
      }
    }

    if (
      payload.descripcion !== undefined &&
      (typeof payload.descripcion !== "string" || !payload.descripcion.trim())
    ) {
      return res.status(400).json({ error: "descripcion inválida." });
    }

    if (
      payload.descripcionDetallada !== undefined &&
      payload.descripcionDetallada !== null &&
      typeof payload.descripcionDetallada !== "string"
    ) {
      return res.status(400).json({ error: "descripcionDetallada inválida." });
    }

    if (payload.alertaActiva !== undefined) {
      payload.alertaActiva = toBoolean(payload.alertaActiva);
      if (typeof payload.alertaActiva !== "boolean") {
        return res.status(400).json({ error: "alertaActiva debe ser boolean." });
      }
    }

    if (
      payload.tipoAnticipacionAlerta !== undefined &&
      payload.tipoAnticipacionAlerta !== null &&
      !TIPO_ANTICIPACION_VALID.has(payload.tipoAnticipacionAlerta)
    ) {
      return res.status(400).json({
        error: "tipoAnticipacionAlerta inválido.",
      });
    }

    if (
      payload.valorAnticipacionAlerta !== undefined &&
      payload.valorAnticipacionAlerta !== null
    ) {
      const v = Number(payload.valorAnticipacionAlerta);
      if (!Number.isFinite(v) || v <= 0) {
        return res.status(400).json({
          error: "valorAnticipacionAlerta debe ser número > 0.",
        });
      }
      payload.valorAnticipacionAlerta = v;
    }

    if (payload.equipoId !== undefined && payload.equipoId !== null && !isUUID(payload.equipoId)) {
      return res.status(400).json({ error: "equipoId inválido." });
    }

    if (
      payload.ubicacionTecnicaId !== undefined &&
      payload.ubicacionTecnicaId !== null &&
      !isUUID(payload.ubicacionTecnicaId)
    ) {
      return res.status(400).json({ error: "ubicacionTecnicaId inválido." });
    }

    if (
      payload.planMantenimientoId !== undefined &&
      payload.planMantenimientoId !== null &&
      !isUUID(payload.planMantenimientoId)
    ) {
      return res.status(400).json({ error: "planMantenimientoId inválido." });
    }

    if (payload.paisId !== undefined && payload.paisId !== null && !isUUID(payload.paisId)) {
      return res.status(400).json({ error: "paisId inválido." });
    }

    if (payload.solicitanteId !== undefined && !isUUID(payload.solicitanteId)) {
      return res.status(400).json({ error: "solicitanteId inválido." });
    }

    if (payload.fechaInicioAlerta !== undefined) {
      const fecha = toDate(payload.fechaInicioAlerta);
      if (!fecha) {
        return res.status(400).json({ error: "fechaInicioAlerta inválida." });
      }
      payload.fechaInicioAlerta = fecha;
    }

    const updated = await sequelize.transaction(async (t) => {
      const guiaActual = await GuiaMantenimiento.findByPk(id, { transaction: t });
      if (!guiaActual || guiaActual.state === false) {
        throw new Error("Guía no encontrada.");
      }

      const equipoIdFinal =
        payload.equipoId !== undefined ? payload.equipoId : guiaActual.equipoId;

      const ubicacionTecnicaIdFinal =
        payload.ubicacionTecnicaId !== undefined
          ? payload.ubicacionTecnicaId
          : guiaActual.ubicacionTecnicaId;

      const hasEquipoFinal = !!equipoIdFinal;
      const hasUbicFinal = !!ubicacionTecnicaIdFinal;

      if (!hasEquipoFinal && !hasUbicFinal) {
        throw new Error("La guía debe tener equipoId o ubicacionTecnicaId.");
      }

      if (hasEquipoFinal && hasUbicFinal) {
        throw new Error("La guía solo puede tener equipoId o ubicacionTecnicaId, no ambos.");
      }

      const planMantenimientoIdFinal =
        payload.planMantenimientoId !== undefined
          ? payload.planMantenimientoId
          : guiaActual.planMantenimientoId;

      let ordenVentaFinal = guiaActual.ordenVenta;
      let paisIdFinal = guiaActual.paisId;
      let creticidadFinal = guiaActual.creticidad;
      let productoFinal = guiaActual.producto;

      if (hasEquipoFinal) {
        const equipo = await Equipo.findByPk(equipoIdFinal, { transaction: t });
        if (!equipo || equipo.state === false) {
          throw new Error("Equipo no existe.");
        }

        await ValidatePlanBelongsToEquipo({
          equipo,
          planMantenimientoId: planMantenimientoIdFinal,
          t,
        });

        ordenVentaFinal = equipo.numeroOV;
        paisIdFinal = equipo.paisId;
        creticidadFinal = equipo.creticidad;
        productoFinal = equipo.producto || equipo.nombre;

        if (!ordenVentaFinal) throw new Error("El equipo no tiene numeroOV.");
        if (!paisIdFinal) throw new Error("El equipo no tiene paisId.");
        if (!creticidadFinal) throw new Error("El equipo no tiene creticidad.");
        if (!productoFinal) throw new Error("El equipo no tiene producto o nombre.");

        payload.equipoId = equipoIdFinal;
        payload.ubicacionTecnicaId = null;
        payload.ordenVenta = ordenVentaFinal;
        payload.paisId = paisIdFinal;
        payload.creticidad = creticidadFinal;
        payload.producto = productoFinal;
      }

      if (hasUbicFinal) {
        const ubicacion = await UbicacionTecnica.findByPk(ubicacionTecnicaIdFinal, {
          transaction: t,
        });
        if (!ubicacion || ubicacion.state === false) {
          throw new Error("Ubicación técnica no existe.");
        }

        await ValidatePlanBelongsToUbicacion({
          ubicacionTecnica: ubicacion,
          planMantenimientoId: planMantenimientoIdFinal,
          t,
        });

        payload.equipoId = null;
        payload.ubicacionTecnicaId = ubicacionTecnicaIdFinal;

        if (payload.ordenVentaManual !== undefined) ordenVentaFinal = payload.ordenVentaManual;
        if (payload.paisIdManual !== undefined) paisIdFinal = payload.paisIdManual;
        if (payload.creticidadManual !== undefined) creticidadFinal = payload.creticidadManual;
        if (payload.productoManual !== undefined) productoFinal = payload.productoManual;

        delete payload.ordenVentaManual;
        delete payload.paisIdManual;
        delete payload.creticidadManual;
        delete payload.productoManual;

        payload.ordenVenta = ordenVentaFinal;
        payload.paisId = paisIdFinal;
        payload.creticidad = creticidadFinal;
        payload.producto = productoFinal;
      }

      const alertaActivaFinal =
        payload.alertaActiva !== undefined ? payload.alertaActiva : guiaActual.alertaActiva;

      const tipoAnticipacionFinal =
        payload.tipoAnticipacionAlerta !== undefined
          ? payload.tipoAnticipacionAlerta
          : guiaActual.tipoAnticipacionAlerta;

      const valorAnticipacionFinal =
        payload.valorAnticipacionAlerta !== undefined
          ? payload.valorAnticipacionAlerta
          : guiaActual.valorAnticipacionAlerta;

      if (alertaActivaFinal) {
        if (!tipoAnticipacionFinal || !TIPO_ANTICIPACION_VALID.has(tipoAnticipacionFinal)) {
          throw new Error("tipoAnticipacionAlerta inválido.");
        }

        const v = Number(valorAnticipacionFinal);
        if (!Number.isFinite(v) || v <= 0) {
          throw new Error("valorAnticipacionAlerta debe ser número > 0.");
        }

        payload.valorAnticipacionAlerta = v;
      } else {
        payload.tipoAnticipacionAlerta = null;
        payload.valorAnticipacionAlerta = null;
      }

      if (payload.descripcion !== undefined) {
        payload.descripcion = payload.descripcion.trim();
      }

      const guia = await UpdateGuiaMantenimiento(id, payload, t);
      return guia;
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/* =======================
   DELETE
======================= */
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

/* =======================
   DELETE ADJUNTO
======================= */
const DeleteAdjuntoGuiaMantenimientoHandler = async (req, res) => {
  try {
    const { adjuntoId } = req.params;
    if (!isUUID(adjuntoId)) {
      return res.status(400).json({ error: "adjuntoId inválido." });
    }

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