const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  Aviso,
  sequelize,
  Adjunto,
  OrdenTrabajoEquipoTrabajador,
  OrdenTrabajoEquipoActividad,
  SolicitudCompra,
  SolicitudCompraLinea,
  SolicitudAlmacen,
  SolicitudAlmacenLinea,
  Tratamiento,
  TratamientoEquipo,
  Notificacion,
  Equipo,
  UbicacionTecnica,
  PersonalCorreo,
} = require("../db_connection");

const {
  enviarSolicitudCompraASAPDesdeObjeto,
} = require("../sap/sapSolicitudCompra");
const {
  fusionarSolicitudesParaSap,
} = require("../controllers/ordenTrabajoDetalleController");
const { Op } = require("sequelize");


const { enviarCorreoSolicitudAlmacen, enviarCorreo } = require("../services/emailService");
const { buildHtmlBloque } = require("../utils/emailTemplates");

/* =========================================================
   HELPERS GENERALES
========================================================= */

/**
 * Construye la clave única de un target.
 * Equipo    → "E:<uuid>"
 * Ubicación → "U:<uuid>"
 */
const getTargetKey = (target) => {
  if (target?.equipoId) return `E:${String(target.equipoId)}`;
  if (target?.ubicacionTecnicaId) return `U:${String(target.ubicacionTecnicaId)}`;
  return null;
};

const getTargetLabel = (target) => {
  if (target?.equipoId) return `equipo ${target.equipoId}`;
  if (target?.ubicacionTecnicaId)
    return `ubicación técnica ${target.ubicacionTecnicaId}`;
  return "target inválido";
};

const ensureValidTarget = (target) => {
  const tieneEquipo = !!target?.equipoId;
  const tieneUbicacion = !!target?.ubicacionTecnicaId;
  if ((tieneEquipo && tieneUbicacion) || (!tieneEquipo && !tieneUbicacion)) {
    throw new Error(
      "Cada registro debe tener solo equipoId o solo ubicacionTecnicaId"
    );
  }
};

const validarActividadesPayload = (equipos = [], tipoMantenimiento = null) => {
  for (const equipo of equipos) {
    const actividades = Array.isArray(equipo.actividades)
      ? equipo.actividades
      : [];

    if (tipoMantenimiento === "Correctivo") {
      if (!actividades.length) {
        throw new Error(
          `El registro ${getTargetLabel(equipo)} debe tener al menos una actividad`
        );
      }
      for (const act of actividades) {
        if (!act.tarea || !String(act.tarea).trim()) {
          throw new Error(
            `Hay una actividad sin tarea en ${getTargetLabel(equipo)}`
          );
        }
        if (
          act.tipoTrabajo &&
          !["REPARACION", "CAMBIO"].includes(act.tipoTrabajo)
        ) {
          throw new Error(
            `Tipo de trabajo inválido en ${getTargetLabel(
              equipo
            )}. Solo REPARACION o CAMBIO`
          );
        }
      }
    }
  }
};

/* =========================================================
   HELPERS SOLICITUDES — CREAR EN OT
   (sin requester, department, comments)
========================================================= */

/**
 * Crea solicitudes de compra en una OT a partir de un payload
 * ya editado por el usuario.
 *
 * @param {object} params
 * @param {string} params.ordenTrabajoId
 * @param {string|null} params.tratamientoId
 * @param {{ general, porEquipo }} params.solicitudes
 * @param {string} params.usuarioId
 * @param {object} params.t - transacción Sequelize
 */
const parseRequiredDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// ─── REEMPLAZAR en ordenTrabajoController.js ───────────────────────────────

async function _crearSolicitudesCompraEnOT({
  ordenTrabajoId,
  tratamientoId,
  solicitudes,
  usuarioId,
  t,
}) {
  if (!solicitudes) return;

  const { general, porEquipo = {} } = solicitudes;

  const lineasValidas = (lineas) =>
    (lineas || []).filter((l) => l.itemCode?.trim() || l.description?.trim());

  // GENERAL
  const generalLineas = lineasValidas(general?.lineas);
  if (general && generalLineas.length > 0) {
    const sc = await SolicitudCompra.create(
      {
        tratamiento_id: tratamientoId || null,
        ordenTrabajoId,
        esGeneral: true,
        esCopia: true,
        origenSolicitudId: general.origenSolicitudId || null,
        docDate: new Date(),
        requiredDate: parseRequiredDate(general.requiredDate),
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      generalLineas.map((l) => ({
        solicitud_compra_id: sc.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode || "",
        description: l.description || "",
        quantity: Number(l.quantity) || 1,
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );

    // Marcar la solicitud general original del tratamiento como "asignada"
    // para que no aparezca disponible en el siguiente equipo
    if (tratamientoId) {
      await SolicitudCompra.update(
        { ordenTrabajoId },
        {
          where: {
            tratamiento_id: tratamientoId,
            esGeneral: true,
            esCopia: false,
            ordenTrabajoId: null,
          },
          transaction: t,
        }
      );
    }
  }

  // POR EQUIPO / UBICACIÓN
  for (const [key, data] of Object.entries(porEquipo)) {
    const equipoLineas = lineasValidas(data?.lineas);
    if (!data || equipoLineas.length === 0) continue;

    const sc = await SolicitudCompra.create(
      {
        tratamiento_id: tratamientoId || null,
        ordenTrabajoId,
        esGeneral: false,
        esCopia: true,
        origenSolicitudId: data.origenSolicitudId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        docDate: new Date(),
        requiredDate: parseRequiredDate(data.requiredDate),
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      equipoLineas.map((l) => ({
        solicitud_compra_id: sc.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode || "",
        description: l.description || "",
        quantity: Number(l.quantity) || 1,
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );
  }
}


async function _crearSolicitudesAlmacenEnOT({
  ordenTrabajoId,
  tratamientoId,
  solicitudes,
  usuarioId,
  t,
}) {
  if (!solicitudes) return;

  const { general, porEquipo = {} } = solicitudes;

  const lineasValidas = (lineas) =>
    (lineas || []).filter((l) => l.itemCode?.trim() || l.description?.trim());

  // GENERAL
  const generalLineas = lineasValidas(general?.lineas);
  if (general && generalLineas.length > 0) {
    const sa = await SolicitudAlmacen.create(
      {
        numeroSolicitud: `SA-OT-${Date.now()}`,
        tratamiento_id: tratamientoId || null,
        ordenTrabajoId,
        esGeneral: true,
        esCopia: true,
        origenSolicitudId: general.origenSolicitudId || null,
        docDate: new Date(),
        requiredDate: parseRequiredDate(general.requiredDate),
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.bulkCreate(
      generalLineas.map((l) => ({
        solicitud_almacen_id: sa.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode || "",
        description: l.description || "",
        quantity: Number(l.quantity) || 1,
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );

    // Marcar la solicitud general original del tratamiento como "asignada"
    // para que no aparezca disponible en el siguiente equipo
    if (tratamientoId) {
      await SolicitudAlmacen.update(
        { ordenTrabajoId },
        {
          where: {
            tratamiento_id: tratamientoId,
            esGeneral: true,
            esCopia: false,
            ordenTrabajoId: null,
          },
          transaction: t,
        }
      );
    }
  }

  // POR EQUIPO / UBICACIÓN
  for (const [key, data] of Object.entries(porEquipo)) {
    const equipoLineas = lineasValidas(data?.lineas);
    if (!data || equipoLineas.length === 0) continue;

    const sa = await SolicitudAlmacen.create(
      {
        numeroSolicitud: `SA-OT-${Date.now()}-${key.slice(0, 8)}`,
        tratamiento_id: tratamientoId || null,
        ordenTrabajoId,
        esGeneral: false,
        esCopia: true,
        origenSolicitudId: data.origenSolicitudId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        docDate: new Date(),
        requiredDate: parseRequiredDate(data.requiredDate),
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.bulkCreate(
      equipoLineas.map((l) => ({
        solicitud_almacen_id: sa.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode || "",
        description: l.description || "",
        quantity: Number(l.quantity) || 1,
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );
  }
}
/* =========================================================
   HELPER — COPIAR ACTIVIDADES A TARGETS OT
========================================================= */
async function copiarActividadesATargetsOT({
  avisoId,
  targetsOT,
  targetsPayload = [],
  t,
}) {
  if (!Array.isArray(targetsOT) || targetsOT.length === 0) return;

  const actividadesCrear = [];

  const payloadByKey = new Map();
  for (const tp of targetsPayload || []) {
    const key = getTargetKey(tp);
    if (key) payloadByKey.set(key, tp);
  }

  const keysSinPayload = [];

  for (const targetOT of targetsOT) {
    const key = getTargetKey(targetOT);
    const payloadTarget = payloadByKey.get(key);

    const actsPayload = Array.isArray(payloadTarget?.actividades)
      ? payloadTarget.actividades
      : null;

    if (actsPayload && actsPayload.length > 0) {
      for (const act of actsPayload) {
        actividadesCrear.push({
          ordenTrabajoEquipoId: targetOT.id,
          planMantenimientoActividadId: act.planMantenimientoActividadId || null,
          sistema: act.sistema || null,
          subsistema: act.subsistema || null,
          componente: act.componente || null,
          tarea: act.tarea || null,
          descripcion: act.descripcion || null,
          tipoTrabajo: act.tipoTrabajo || null,
          rolTecnico: act.rolTecnico || null,
          cantidadTecnicos: act.cantidadTecnicos ?? null,
          duracionEstimadaValor: act.duracionEstimadaValor ?? null,
          unidadDuracion: act.unidadDuracion || "min",
          duracionEstimadaMin: act.duracionEstimadaMin ?? null,
          duracionRealValor: act.duracionRealValor ?? null,
          unidadDuracionReal: act.unidadDuracionReal || "min",
          duracionRealMin: act.duracionRealMin ?? null,
          observaciones: act.observaciones || null,
          estado: act.estado || "PENDIENTE",
          origen: act.origen || "MANUAL",
          tratamientoEquipoActividadId: act.tratamientoEquipoActividadId || null,
        });
      }
    } else {
      keysSinPayload.push(key);
    }
  }

  // Para los targets sin actividades en payload, las tomamos del tratamiento en BD
  if (keysSinPayload.length > 0) {
    const tratamiento = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (tratamiento) {
      const equipoIds = targetsOT.map((x) => x.equipoId).filter(Boolean);
      const ubicacionIds = targetsOT
        .map((x) => x.ubicacionTecnicaId)
        .filter(Boolean);

      const where = { tratamientoId: tratamiento.id, [Op.or]: [] };

      if (equipoIds.length)
        where[Op.or].push({ equipoId: { [Op.in]: equipoIds } });
      if (ubicacionIds.length)
        where[Op.or].push({ ubicacionTecnicaId: { [Op.in]: ubicacionIds } });

      if (where[Op.or].length > 0) {
        const tes = await TratamientoEquipo.findAll({
          where,
          include: [{ association: "actividades" }],
          transaction: t,
        });

        const actsByTargetKey = new Map();
        for (const te of tes) {
          actsByTargetKey.set(getTargetKey(te), te.actividades || []);
        }

        for (const targetOT of targetsOT) {
          const key = getTargetKey(targetOT);
          if (!keysSinPayload.includes(key)) continue;

          const acts = actsByTargetKey.get(key) || [];
          for (const act of acts) {
            actividadesCrear.push({
              ordenTrabajoEquipoId: targetOT.id,
              planMantenimientoActividadId:
                act.planMantenimientoActividadId || null,
              sistema: act.sistema || null,
              subsistema: act.subsistema || null,
              componente: act.componente || null,
              tarea: act.tarea || null,
              descripcion: act.descripcion || null,
              tipoTrabajo: act.tipoTrabajo || null,
              rolTecnico: act.rolTecnico || null,
              cantidadTecnicos: act.cantidadTecnicos ?? null,
              duracionEstimadaValor: act.duracionEstimadaValor ?? null,
              unidadDuracion: act.unidadDuracion || "min",
              duracionEstimadaMin: act.duracionEstimadaMin ?? null,
              duracionRealValor: null,
              unidadDuracionReal: "min",
              duracionRealMin: null,
              observaciones: act.observaciones || null,
              estado: "PENDIENTE",
              origen: "TRATAMIENTO",
              tratamientoEquipoActividadId: act.id || null,
            });
          }
        }
      }
    }
  }

  if (actividadesCrear.length) {
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, {
      transaction: t,
    });
  }
}

/* =========================================================
   HELPER — VALIDAR TARGETS DEL AVISO
========================================================= */
async function validarTargetsDelAviso(avisoId, equipos, t) {
  if (!Array.isArray(equipos) || equipos.length === 0) {
    throw new Error("Debe enviar al menos un equipo o ubicación técnica");
  }

  const aviso = await Aviso.findByPk(avisoId, {
    include: [
      { association: "equiposRelacion" },
      { association: "ubicacionesRelacion" },
    ],
    transaction: t,
  });

  if (!aviso) throw new Error("Aviso no encontrado");

  const equipoIdsAviso = new Set(
    (aviso.equiposRelacion || []).map((x) => String(x.equipoId))
  );
  const ubicacionIdsAviso = new Set(
    (aviso.ubicacionesRelacion || []).map((x) =>
      String(x.ubicacionTecnicaId || x.ubicacionId)
    )
  );

  for (const equipo of equipos) {
    ensureValidTarget(equipo);

    if (equipo.equipoId && !equipoIdsAviso.has(String(equipo.equipoId))) {
      throw new Error(`El equipo ${equipo.equipoId} no pertenece al aviso`);
    }

    if (
      equipo.ubicacionTecnicaId &&
      !ubicacionIdsAviso.has(String(equipo.ubicacionTecnicaId))
    ) {
      throw new Error(
        `La ubicación técnica ${equipo.ubicacionTecnicaId} no pertenece al aviso`
      );
    }
  }
}

/* =========================================================
   HELPER — CREAR UNA OT INTERNA
========================================================= */
async function crearOTInterna(
  {
    aviso,
    otDataBase,
    equipos,
    adjuntos,
    solicitudesCompra = null,
    solicitudesAlmacen = null,
    usuarioId = null,
    tratamientoId = null,
  },
  t
) {
  const countOT = await OrdenTrabajo.count({
    where: { avisoId: aviso.id },
    transaction: t,
  });

  const correlativo = String(countOT + 1).padStart(3, "0");

  const ot = await OrdenTrabajo.create(
    {
      ...otDataBase,
      avisoId: aviso.id,
      numeroOT: `${aviso.numeroAviso}-OT${correlativo}`,
    },
    { transaction: t }
  );

  const targetsOT = await OrdenTrabajoEquipo.bulkCreate(
    equipos.map((x) => {
      ensureValidTarget(x);
      return {
        ordenTrabajoId: ot.id,
        equipoId: x.equipoId || null,
        ubicacionTecnicaId: x.ubicacionTecnicaId || null,
        descripcionEquipo:
          x.descripcionEquipo || x.descripcionUbicacion || null,
        prioridad: x.prioridad || "MEDIA",
        planMantenimientoId: x.planMantenimientoId || null,
        fechaInicioProgramada: x.fechaInicioProgramada || null,
        fechaFinProgramada: x.fechaFinProgramada || null,
        fechaInicioReal: x.fechaInicioReal || null,
        fechaFinReal: x.fechaFinReal || null,
        observacionesEquipo: x.observacionesEquipo || null,
        estadoEquipo: x.estadoEquipo || "PENDIENTE",
        observaciones: x.observaciones || null,
      };
    }),
    { transaction: t, returning: true }
  );

  // Solicitudes de compra
  if (solicitudesCompra) {
    await _crearSolicitudesCompraEnOT({
      ordenTrabajoId: ot.id,
      tratamientoId,
      solicitudes: solicitudesCompra,
      usuarioId,
      t,
    });
  }

  // Solicitudes de almacén
  if (solicitudesAlmacen) {
    await _crearSolicitudesAlmacenEnOT({
      ordenTrabajoId: ot.id,
      tratamientoId,
      solicitudes: solicitudesAlmacen,
      usuarioId,
      t,
    });
  }

  // Actividades del tratamiento
  await copiarActividadesATargetsOT({
    avisoId: aviso.id,
    targetsOT,
    targetsPayload: equipos,
    t,
  });

  // Trabajadores
  const trabajadoresTarget = [];
  targetsOT.forEach((targetCreado, index) => {
    const trabajadores = equipos[index]?.trabajadores || [];
    trabajadores.forEach((trab) => {
      trabajadoresTarget.push({
        ordenTrabajoEquipoId: targetCreado.id,
        trabajadorId: trab.trabajadorId,
        esEncargado: trab.esEncargado || false,
      });
    });
  });

  if (trabajadoresTarget.length) {
    await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresTarget, {
      transaction: t,
    });
  }

  // Adjuntos OT general
  if (adjuntos?.length) {
    await Adjunto.bulkCreate(
      adjuntos.map((a) => ({
        nombre: a.nombre,
        url: a.url,
        extension: a.extension || null,
        categoria: a.categoria || null,
        mostrarEnPortal: a.mostrarEnPortal ?? false,
        tituloPortal: a.tituloPortal || null,
        descripcionPortal: a.descripcionPortal || null,
        ordenPortal: a.ordenPortal ?? 0,
        ordenTrabajoId: ot.id,
      })),
      { transaction: t }
    );
  }

  // Adjuntos por equipo
  for (let index = 0; index < targetsOT.length; index++) {
    const equipoCreado = targetsOT[index];
    const payloadEquipo = equipos[index];

    if (
      Array.isArray(payloadEquipo?.adjuntos) &&
      payloadEquipo.adjuntos.length
    ) {
      await Adjunto.bulkCreate(
        payloadEquipo.adjuntos.map((a) => ({
          nombre: a.nombre,
          url: a.url,
          extension: a.extension || null,
          categoria: a.categoria || null,
          mostrarEnPortal: a.mostrarEnPortal ?? false,
          tituloPortal: a.tituloPortal || null,
          descripcionPortal: a.descripcionPortal || null,
          ordenPortal: a.ordenPortal ?? 0,
          ordenTrabajoEquipoId: equipoCreado.id,
        })),
        { transaction: t }
      );
    }
  }

  return ot;
}

/* =========================================================
   FUNCIÓN PRINCIPAL — crearOrdenTrabajo
   
   Payload esperado:
   {
     avisoId,
     equipos: [...],
     adjuntos: [...],
     modo: "GRUPAL" | "INDIVIDUAL",
     
     // Solo en INDIVIDUAL — indica a qué OT va la solicitud general
     // de forma INDEPENDIENTE para compra y almacén
     solicitudGeneralStrategy: {
       compra:  { tipo: "ASIGNAR", targetKey: "E:<uuid>" } | { tipo: "NINGUNA" },
       almacen: { tipo: "ASIGNAR", targetKey: "U:<uuid>" } | { tipo: "NINGUNA" },
     },
     
     // Solicitudes ya editadas por el usuario
     // general puede ser null si no existe
     // porEquipo puede estar vacío si no hay por equipo
     solicitudesCompra: {
       general: { requiredDate, lineas: [...], origenSolicitudId } | null,
       porEquipo: { "E:<uuid>": { requiredDate, lineas: [...] } }
     },
     solicitudesAlmacen: { ... }, // misma estructura
     
     usuarioId,
     ...otData (descripcionGeneral, etc.)
   }
========================================================= */
async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const {
      equipos = [],
      adjuntos = [],
      modo = "GRUPAL",
      solicitudGeneralStrategy = { compra: { tipo: "NINGUNA" }, almacen: { tipo: "NINGUNA" } },
      solicitudesCompra = null,
      solicitudesAlmacen = null,
      usuarioId = null,
      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");

    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    const esVenta = aviso.tipoAviso === "venta";

    if (!esVenta && !equipos.length)
      throw new Error("Debe enviar al menos un equipo o ubicación técnica");

    equipos.forEach(ensureValidTarget);

    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento)
        throw new Error("El aviso no tiene tipo de mantenimiento");
      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      otData.tipoMantenimiento = null;
    }

    if (!esVenta) await validarTargetsDelAviso(aviso.id, equipos, t);
    validarActividadesPayload(equipos, otData.tipoMantenimiento);

    // Obtener tratamientoId si existe
    const tratamiento = await Tratamiento.findOne({
      where: { aviso_id: aviso.id },
      transaction: t,
    });
    const tratamientoId = tratamiento?.id || null;

    const otsCreadas = [];

    /* =====================================================
       MODO GRUPAL
       - Una sola OT con todos los equipos
       - La solicitud general va directamente si existe
    ===================================================== */
    if (modo === "GRUPAL") {
      const ot = await crearOTInterna(
        {
          aviso,
          otDataBase: otData,
          equipos,
          adjuntos,
          solicitudesCompra,
          solicitudesAlmacen,
          usuarioId,
          tratamientoId,
        },
        t
      );
      otsCreadas.push(ot);
    }

    /* =====================================================
       MODO INDIVIDUAL
       - Una OT por equipo/ubicación
       - Solicitud por equipo → va a su OT automáticamente
       - Solicitud general → el usuario elige el targetKey
         de forma independiente para compra y almacén
         Si tipo="NINGUNA" → no se asigna a ninguna OT
         (queda pendiente para asignar después)
    ===================================================== */
    if (modo === "INDIVIDUAL") {
      const estrategiaCompra = solicitudGeneralStrategy?.compra || { tipo: "NINGUNA" };
      const estrategiaAlmacen = solicitudGeneralStrategy?.almacen || { tipo: "NINGUNA" };

      // Validar que el targetKey exista en los equipos enviados
      if (estrategiaCompra.tipo === "ASIGNAR") {
        if (!estrategiaCompra.targetKey) {
          throw new Error(
            "solicitudGeneralStrategy.compra.targetKey es obligatorio cuando tipo=ASIGNAR"
          );
        }
        const existe = equipos.some(
          (e) => getTargetKey(e) === estrategiaCompra.targetKey
        );
        if (!existe) {
          throw new Error(
            `solicitudGeneralStrategy.compra.targetKey "${estrategiaCompra.targetKey}" no corresponde a ningún equipo enviado`
          );
        }
      }

      if (estrategiaAlmacen.tipo === "ASIGNAR") {
        if (!estrategiaAlmacen.targetKey) {
          throw new Error(
            "solicitudGeneralStrategy.almacen.targetKey es obligatorio cuando tipo=ASIGNAR"
          );
        }
        const existe = equipos.some(
          (e) => getTargetKey(e) === estrategiaAlmacen.targetKey
        );
        if (!existe) {
          throw new Error(
            `solicitudGeneralStrategy.almacen.targetKey "${estrategiaAlmacen.targetKey}" no corresponde a ningún equipo enviado`
          );
        }
      }

      for (const equipo of equipos) {
        const key = getTargetKey(equipo);

        // ── Compra para esta OT ──────────────────────────
        let solicitudesCompraParaOT = null;

        if (solicitudesCompra) {
          const datoPorEquipo = solicitudesCompra.porEquipo?.[key] ?? null;

          // La general solo va a la OT cuyo targetKey coincide con la estrategia
          const generalParaOT =
            estrategiaCompra.tipo === "ASIGNAR" &&
            estrategiaCompra.targetKey === key
              ? (solicitudesCompra.general ?? null)
              : null;

          if (generalParaOT || datoPorEquipo) {
            solicitudesCompraParaOT = {
              general: generalParaOT,
              porEquipo: datoPorEquipo ? { [key]: datoPorEquipo } : {},
            };
          }
        }

        // ── Almacén para esta OT ─────────────────────────
        let solicitudesAlmacenParaOT = null;

        if (solicitudesAlmacen) {
          const datoPorEquipo = solicitudesAlmacen.porEquipo?.[key] ?? null;

          const generalParaOT =
            estrategiaAlmacen.tipo === "ASIGNAR" &&
            estrategiaAlmacen.targetKey === key
              ? (solicitudesAlmacen.general ?? null)
              : null;

          if (generalParaOT || datoPorEquipo) {
            solicitudesAlmacenParaOT = {
              general: generalParaOT,
              porEquipo: datoPorEquipo ? { [key]: datoPorEquipo } : {},
            };
          }
        }

        const ot = await crearOTInterna(
          {
            aviso,
            otDataBase: otData,
            equipos: [equipo],
            adjuntos,
            solicitudesCompra: solicitudesCompraParaOT,
            solicitudesAlmacen: solicitudesAlmacenParaOT,
            usuarioId,
            tratamientoId,
          },
          t
        );

        otsCreadas.push(ot);
      }
    }

    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });

    // Traer las OTs dentro de la transacción
    const resultado = await OrdenTrabajo.findAll({
      where: { id: { [Op.in]: otsCreadas.map((x) => x.id) } },
      include: [
        {
          association: "equipos",
          include: [
            { association: "equipo" },
            { association: "ubicacionTecnica" },
            { association: "planMantenimiento" },
            { association: "adjuntos" },
            { association: "actividades" },
            { association: "trabajadores", include: ["trabajador"] },
          ],
        },
        { association: "solicitudesCompra" },
        { association: "solicitudesAlmacen" },
        { association: "adjuntos" },
      ],
      order: [["createdAt", "DESC"]],
      transaction: t,  // ← dentro de la transacción
    });

    await t.commit();
    return resultado;  // ← retornar después del commit

  } catch (error) {
    try {
      await t.rollback();
    } catch (rollbackErr) {
      if (!rollbackErr.message?.includes('finished with state')) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    throw error;
  }
}

/* =========================================================
   OBTENER SOLICITUDES PENDIENTES (general sin asignar)
   
   Útil para el modal del frontend: muestra si existe una
   solicitud general del tratamiento que todavía no fue
   asignada a ninguna OT.
========================================================= */
async function obtenerSolicitudesGeneralesPendientes(avisoId) {
  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
  });

  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  // Solicitudes generales del tratamiento que NO tienen OT asignada
  const [comprasSinOT, almacenesSinOT] = await Promise.all([
    SolicitudCompra.findAll({
      where: {
        tratamiento_id: tratamiento.id,
        esGeneral: true,
        ordenTrabajoId: null,
      },
      include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    }),
    SolicitudAlmacen.findAll({
      where: {
        tratamiento_id: tratamiento.id,
        esGeneral: true,
        ordenTrabajoId: null,
      },
      include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
    }),
  ]);

  return {
    hayPendientes: comprasSinOT.length > 0 || almacenesSinOT.length > 0,
    solicitudesCompra: comprasSinOT,
    solicitudesAlmacen: almacenesSinOT,
  };
}

/* =========================================================
   ASIGNAR SOLICITUD GENERAL A UNA OT (después de crearla)
   
   Permite que el usuario, desde el modal, asigne la solicitud
   general que quedó sin OT a una OT específica.
========================================================= */
async function asignarSolicitudGeneralAOT({
  solicitudCompraId = null,
  solicitudAlmacenId = null,
  ordenTrabajoId,
}) {
  if (!ordenTrabajoId) throw new Error("ordenTrabajoId es obligatorio");
  if (!solicitudCompraId && !solicitudAlmacenId) {
    throw new Error("Debe enviar al menos solicitudCompraId o solicitudAlmacenId");
  }

  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");

  const resultados = {};

  if (solicitudCompraId) {
    const sc = await SolicitudCompra.findByPk(solicitudCompraId);
    if (!sc) throw new Error(`SolicitudCompra ${solicitudCompraId} no encontrada`);
    if (sc.ordenTrabajoId) {
      throw new Error(
        `La solicitud de compra ya está asignada a la OT ${sc.ordenTrabajoId}`
      );
    }
    await sc.update({ ordenTrabajoId });
    resultados.solicitudCompra = sc;
  }

  if (solicitudAlmacenId) {
    const sa = await SolicitudAlmacen.findByPk(solicitudAlmacenId);
    if (!sa) throw new Error(`SolicitudAlmacen ${solicitudAlmacenId} no encontrada`);
    if (sa.ordenTrabajoId) {
      throw new Error(
        `La solicitud de almacén ya está asignada a la OT ${sa.ordenTrabajoId}`
      );
    }
    await sa.update({ ordenTrabajoId });
    resultados.solicitudAlmacen = sa;
  }

  return resultados;
}

/* =========================================================
   OBTENER SOLICITUDES POR OT
========================================================= */
async function obtenerSolicitudesPorOT(ordenTrabajoId) {
  const [solicitudesCompra, solicitudesAlmacen] = await Promise.all([
    SolicitudCompra.findAll({
      where: { ordenTrabajoId },
      include: [
        { model: SolicitudCompraLinea, as: "lineas" },
        { model: Equipo, as: "equipo" },
        { model: UbicacionTecnica, as: "ubicacionTecnica" },
      ],
      order: [["createdAt", "ASC"]],
    }),
    SolicitudAlmacen.findAll({
      where: { ordenTrabajoId },
      include: [
        { model: SolicitudAlmacenLinea, as: "lineas" },
        { model: Equipo, as: "equipo" },
        { model: UbicacionTecnica, as: "ubicacionTecnica" },
      ],
      order: [["createdAt", "ASC"]],
    }),
  ]);

  return { solicitudesCompra, solicitudesAlmacen };
}

/* =========================================================
   OBTENER ÓRDENES DE TRABAJO
========================================================= */
async function obtenerOrdenesTrabajo() {
  return OrdenTrabajo.findAll({
    include: [
      {
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "ubicacionTecnica" },
          { association: "adjuntos" },
          { association: "trabajadores", include: ["trabajador"] },
          { association: "actividades" },
        ],
      },
      { association: "adjuntos" },
      { association: "supervisor", attributes: ["id", "nombre", "apellido"] },
      { association: "aviso", attributes: ["id", "tipoAviso", "numeroAviso"] },
    ],
  });
}

async function obtenerOrdenTrabajoPorId(id) {
  return OrdenTrabajo.findByPk(id, {
    include: [
      { association: "tratamiento" },
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
}

/* =========================================================
   ACTUALIZAR OT COMPLETA
========================================================= */
async function actualizarOrdenTrabajoCompleta(id, data) {
  const transaction = await sequelize.transaction();

  try {
    const ot = await OrdenTrabajo.findByPk(id, { transaction });
    if (!ot) {
      await transaction.rollback();
      return null;
    }

    const camposOTPermitidos = [
      "numeroOT", "tipoMantenimiento", "descripcionGeneral", "estado",
      "supervisorId", "fechaProgramadaInicio", "fechaProgramadaFin",
      "fechaInicioReal", "fechaFinReal", "fechaCierre", "observaciones",
      "avisoId", "tratamientoId", "id",
    ];

    const dataOT = {};
    for (const campo of camposOTPermitidos) {
      if (data[campo] !== undefined) dataOT[campo] = data[campo];
    }

    await ot.update(dataOT, { transaction });

    // Adjuntos generales OT
    if (Array.isArray(data.adjuntos)) {
      const adjuntosActualesOT = await Adjunto.findAll({
        where: { ordenTrabajoId: id, ordenTrabajoEquipoId: null },
        transaction,
      });

      const idsPayloadOT = data.adjuntos.filter((a) => a.id).map((a) => a.id);

      for (const adj of adjuntosActualesOT) {
        if (!idsPayloadOT.includes(adj.id)) await adj.destroy({ transaction });
      }

      for (const adjunto of data.adjuntos) {
        const payload = {
          nombre: adjunto.nombre, url: adjunto.url,
          extension: adjunto.extension ?? null, categoria: adjunto.categoria ?? null,
          mostrarEnPortal: adjunto.mostrarEnPortal ?? false,
          tituloPortal: adjunto.tituloPortal ?? null,
          descripcionPortal: adjunto.descripcionPortal ?? null,
          ordenPortal: adjunto.ordenPortal ?? 0,
          ordenTrabajoId: id, ordenTrabajoEquipoId: null,
        };

        if (adjunto.id) {
          const existente = await Adjunto.findOne({
            where: { id: adjunto.id, ordenTrabajoId: id, ordenTrabajoEquipoId: null },
            transaction,
          });
          existente
            ? await existente.update(payload, { transaction })
            : await Adjunto.create({ id: adjunto.id, ...payload }, { transaction });
        } else {
          await Adjunto.create(payload, { transaction });
        }
      }
    }

    // Equipos
    if (Array.isArray(data.equipos)) {
      const equiposActuales = await OrdenTrabajoEquipo.findAll({
        where: { ordenTrabajoId: id },
        transaction,
      });

      const idsEquiposPayload = data.equipos.filter((e) => e.id).map((e) => e.id);

      for (const eq of equiposActuales) {
        if (!idsEquiposPayload.includes(eq.id)) {
          await OrdenTrabajoEquipoTrabajador.destroy({
            where: { ordenTrabajoEquipoId: eq.id }, transaction,
          });
          await OrdenTrabajoEquipoActividad.destroy({
            where: { ordenTrabajoEquipoId: eq.id }, transaction,
          });
          await Adjunto.destroy({ where: { ordenTrabajoEquipoId: eq.id }, transaction });
          await eq.destroy({ transaction });
        }
      }

      for (const equipo of data.equipos) {
        const payloadEquipo = {
          ordenTrabajoId: id,
          equipoId: equipo.equipoId ?? null,
          ubicacionTecnicaId: equipo.ubicacionTecnicaId ?? null,
          descripcionEquipo: equipo.descripcionEquipo ?? null,
          planMantenimientoId: equipo.planMantenimientoId ?? null,
          prioridad: equipo.prioridad ?? "MEDIA",
          fechaInicioProgramada: equipo.fechaInicioProgramada ?? null,
          fechaFinProgramada: equipo.fechaFinProgramada ?? null,
          fechaInicioReal: equipo.fechaInicioReal ?? null,
          fechaFinReal: equipo.fechaFinReal ?? null,
          observacionesEquipo: equipo.observacionesEquipo ?? null,
          estadoEquipo: equipo.estadoEquipo ?? "PENDIENTE",
          observaciones: equipo.observaciones ?? null,
        };

        let equipoGuardado;

        if (equipo.id) {
          equipoGuardado = await OrdenTrabajoEquipo.findOne({
            where: { id: equipo.id, ordenTrabajoId: id }, transaction,
          });
          equipoGuardado
            ? await equipoGuardado.update(payloadEquipo, { transaction })
            : (equipoGuardado = await OrdenTrabajoEquipo.create(
                { id: equipo.id, ...payloadEquipo }, { transaction }
              ));
        } else {
          equipoGuardado = await OrdenTrabajoEquipo.create(payloadEquipo, { transaction });
        }

        // Trabajadores
        if (Array.isArray(equipo.trabajadores)) {
          const trabActuales = await OrdenTrabajoEquipoTrabajador.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
          });
          const idsTrabPayload = equipo.trabajadores.filter((t) => t.id).map((t) => t.id);
          for (const trab of trabActuales) {
            if (!idsTrabPayload.includes(trab.id)) await trab.destroy({ transaction });
          }
          for (const trabajador of equipo.trabajadores) {
            const payloadTrab = {
              ordenTrabajoEquipoId: equipoGuardado.id,
              trabajadorId: trabajador.trabajadorId,
              esEncargado: trabajador.esEncargado ?? false,
            };
            if (trabajador.id) {
              const existente = await OrdenTrabajoEquipoTrabajador.findOne({
                where: { id: trabajador.id, ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
              });
              existente
                ? await existente.update(payloadTrab, { transaction })
                : await OrdenTrabajoEquipoTrabajador.create(
                    { id: trabajador.id, ...payloadTrab }, { transaction }
                  );
            } else {
              await OrdenTrabajoEquipoTrabajador.create(payloadTrab, { transaction });
            }
          }
        }

        // Actividades
        if (Array.isArray(equipo.actividades)) {
          const actActuales = await OrdenTrabajoEquipoActividad.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
          });
          const idsActPayload = equipo.actividades.filter((a) => a.id).map((a) => a.id);
          for (const act of actActuales) {
            if (!idsActPayload.includes(act.id)) await act.destroy({ transaction });
          }
          for (const actividad of equipo.actividades) {
            const payloadAct = {
              ordenTrabajoEquipoId: equipoGuardado.id,
              planMantenimientoActividadId: actividad.planMantenimientoActividadId ?? null,
              sistema: actividad.sistema ?? null,
              subsistema: actividad.subsistema ?? null,
              componente: actividad.componente ?? null,
              tarea: actividad.tarea,
              tipoTrabajo: actividad.tipoTrabajo ?? null,
              duracionEstimadaValor: actividad.duracionEstimadaValor ?? null,
              unidadDuracion: actividad.unidadDuracion ?? "min",
              duracionEstimadaMin: actividad.duracionEstimadaMin ?? null,
              duracionRealValor: actividad.duracionRealValor ?? null,
              unidadDuracionReal: actividad.unidadDuracionReal ?? "min",
              duracionRealMin: actividad.duracionRealMin ?? null,
              estado: actividad.estado ?? "PENDIENTE",
              origen: actividad.origen ?? "PLAN",
              descripcion: actividad.descripcion ?? null,
              tratamientoEquipoActividadId: actividad.tratamientoEquipoActividadId ?? null,
              observaciones: actividad.observaciones ?? null,
            };
            if (actividad.id) {
              const existente = await OrdenTrabajoEquipoActividad.findOne({
                where: { id: actividad.id, ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
              });
              existente
                ? await existente.update(payloadAct, { transaction })
                : await OrdenTrabajoEquipoActividad.create(
                    { id: actividad.id, ...payloadAct }, { transaction }
                  );
            } else {
              await OrdenTrabajoEquipoActividad.create(payloadAct, { transaction });
            }
          }
        }

        // Adjuntos por equipo
        if (Array.isArray(equipo.adjuntos)) {
          const adjActuales = await Adjunto.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
          });
          const idsAdjPayload = equipo.adjuntos.filter((a) => a.id).map((a) => a.id);
          for (const adj of adjActuales) {
            if (!idsAdjPayload.includes(adj.id)) await adj.destroy({ transaction });
          }
          for (const adjunto of equipo.adjuntos) {
            const payloadAdj = {
              nombre: adjunto.nombre, url: adjunto.url,
              extension: adjunto.extension ?? null, categoria: adjunto.categoria ?? null,
              mostrarEnPortal: adjunto.mostrarEnPortal ?? false,
              tituloPortal: adjunto.tituloPortal ?? null,
              descripcionPortal: adjunto.descripcionPortal ?? null,
              ordenPortal: adjunto.ordenPortal ?? 0,
              ordenTrabajoId: null,
              ordenTrabajoEquipoId: equipoGuardado.id,
            };
            if (adjunto.id) {
              const existente = await Adjunto.findOne({
                where: { id: adjunto.id, ordenTrabajoEquipoId: equipoGuardado.id }, transaction,
              });
              existente
                ? await existente.update(payloadAdj, { transaction })
                : await Adjunto.create({ id: adjunto.id, ...payloadAdj }, { transaction });
            } else {
              await Adjunto.create(payloadAdj, { transaction });
            }
          }
        }
      }
    }

    await transaction.commit();

    return OrdenTrabajo.findByPk(id, {
      include: [
        {
          model: OrdenTrabajoEquipo,
          as: "equipos",
          include: [
            { model: OrdenTrabajoEquipoTrabajador, as: "trabajadores" },
            { model: OrdenTrabajoEquipoActividad, as: "actividades" },
            { model: Adjunto, as: "adjuntos" },
          ],
        },
        { model: Adjunto, as: "adjuntos" },
      ],
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/* =========================================================
   ELIMINAR OT
========================================================= */
async function eliminarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;

  await Adjunto.destroy({ where: { ordenTrabajoId: id } });
  await OrdenTrabajoEquipo.destroy({ where: { ordenTrabajoId: id } });
  await ot.destroy();

  return true;
}

/* =========================================================
   CIERRE TÉCNICO
========================================================= */
async function actualizarOTACierreTecnicoSiCompleta(ordenTrabajoId, transaction) {
  if (!ordenTrabajoId) throw new Error("ordenTrabajoId es obligatorio");

  const totalRegistrosOT = await OrdenTrabajoEquipo.count({
    where: { ordenTrabajoId },
    transaction,
  });

  if (!totalRegistrosOT) {
    return {
      ok: false, changed: false,
      totalRegistrosOT: 0, totalNotificaciones: 0,
      reason: "La OT no tiene registros asociados",
    };
  }

  const registrosOT = await OrdenTrabajoEquipo.findAll({
    where: { ordenTrabajoId },
    attributes: ["id"],
    transaction,
  });

  const idsRegistrosOT = registrosOT.map((r) => r.id);

  const totalNotificaciones = await Notificacion.count({
    where: {
      ordenTrabajoId,
      ordenTrabajoEquipoId: { [Op.in]: idsRegistrosOT },
    },
    transaction,
  });

  if (totalNotificaciones === totalRegistrosOT) {
    await OrdenTrabajo.update(
      { estado: "CIERRE_TECNICO" },
      { where: { id: ordenTrabajoId }, transaction }
    );
    return { ok: true, changed: true, totalRegistrosOT, totalNotificaciones };
  }

  return { ok: true, changed: false, totalRegistrosOT, totalNotificaciones };
}

/* =========================================================
   SYNC SAP — COMPRA (segunda tanda post-liberación)
   Solo procesa solicitudes NO consolidadas con estado DRAFT o ERROR,
   genera un nuevo número SC-OV-XXX y crea un nuevo registro consolidado.
========================================================= */
async function syncSolicitudesCompraOT(id) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) throw new Error("OT no encontrada");

  // Solo solicitudes DRAFT (no ERROR, no SENT) — evita procesar las ya intentadas
  const pendientes = await SolicitudCompra.findAll({
    where: {
      ordenTrabajoId: id,
      esConsolidada: false,
      esCopia: true,
      estado: "DRAFT",
    },
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });

  if (!pendientes.length) throw new Error("No hay solicitudes DRAFT pendientes para sync");

  // Fusionar líneas
  const { lineas } = _fusionarItemsParaVista(pendientes);
  if (!lineas.length) throw new Error("No hay líneas válidas para sync");

  // ── Buscar si ya existe una consolidada en ERROR o DRAFT ──────────────────
  // Si existe, la reutilizamos (actualizar líneas + reintentar SAP) en vez de duplicar
  let consolidada = await SolicitudCompra.findOne({
    where: {
      ordenTrabajoId: id,
      esConsolidada: true,
      estado: { [Op.in]: ["DRAFT", "ERROR"] },
    },
  });

  if (consolidada) {
    // Reemplazar líneas de la consolidada existente
    await SolicitudCompraLinea.destroy({
      where: { solicitud_compra_id: consolidada.id },
    });
    await consolidada.update({ estado: "DRAFT", sapDocNum: null });
  } else {
    // Crear nueva consolidada
    const ordenVenta = await _obtenerOVdeOT(id);
    const numero = await _generarNumeroSolicitudOT({
      modelo: SolicitudCompra,
      prefijo: "SC",
      ordenVenta,
    });
    const base = pendientes[0];
    consolidada = await SolicitudCompra.create({
      numeroSolicitud: numero,
      ordenTrabajoId: id,
      tratamiento_id: base.tratamiento_id || null,
      esGeneral: true,
      esCopia: false,
      esConsolidada: true,
      docDate: new Date(),
      requiredDate: base.requiredDate || null,
      usuario_id: base.usuario_id || null,
      estado: "DRAFT",
    });
  }

  await SolicitudCompraLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_compra_id: consolidada.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: l.quantity,
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId || null,
      paqueteTrabajoId: l.paqueteTrabajoId || null,
    }))
  );

  const consolidadaConLineas = await SolicitudCompra.findByPk(consolidada.id, {
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });

  // Enviar a SAP
  const resultado = await enviarSolicitudCompraASAPDesdeObjeto(
    consolidadaConLineas.toJSON()
  );

  // Actualizar estado de la consolidada
  await consolidada.update({
    estado: resultado.success ? "SENT" : "ERROR",
    sapDocNum: resultado.success ? resultado.data?.DocNum : null,
  });

  // Si fue exitoso, marcar los originales como SENT
  // Si falló, los originales quedan en DRAFT para poder reintentar
  if (resultado.success) {
    for (const sc of pendientes) {
      await sc.update({ estado: "SENT" });
    }
  }

  return {
    success: resultado.success,
    numeroSolicitud: consolidada.numeroSolicitud,
    procesadas: pendientes.length,
    sapDocNum: resultado.success ? resultado.data?.DocNum : null,
    error: resultado.success ? undefined : resultado.error,
  };
}

/* =========================================================
   SYNC CORREO — ALMACÉN (segunda tanda post-liberación)
   Solo procesa solicitudes NO consolidadas con estado DRAFT,
   genera un nuevo número SA-OV-XXX y envía correo al destinatario.
========================================================= */
async function syncSolicitudesAlmacenOT(id, { destinatarioId }) {
  if (!destinatarioId) throw new Error("destinatarioId es obligatorio");

  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) throw new Error("OT no encontrada");

  const destinatario = await PersonalCorreo.findByPk(destinatarioId);
  if (!destinatario) throw new Error("Destinatario no encontrado");
  if (!destinatario.correo) throw new Error("El destinatario no tiene correo registrado");

  // Solo las copias OT (no consolidadas) pendientes — excluimos el original del tratamiento
  const pendientes = await SolicitudAlmacen.findAll({
    where: {
      ordenTrabajoId: id,
      esConsolidada: false,
      esCopia: true,
      estado: { [Op.in]: ["DRAFT", "ERROR"] },
    },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });

  if (!pendientes.length) throw new Error("No hay solicitudes de almacén pendientes para sync");

  const { lineas } = _fusionarItemsParaVista(pendientes);
  if (!lineas.length) throw new Error("No hay líneas válidas para sync");

  // Generar nuevo número SA-OV-XXX
  const ordenVenta = await _obtenerOVdeOT(id);
  const numero = await _generarNumeroSolicitudOT({
    modelo: SolicitudAlmacen,
    prefijo: "SA",
    ordenVenta,
  });

  const base = pendientes[0];

  // Crear registro consolidado
  const consolidada = await SolicitudAlmacen.create({
    numeroSolicitud: numero,
    ordenTrabajoId: id,
    tratamiento_id: base.tratamiento_id || null,
    esGeneral: true,
    esCopia: false,
    esConsolidada: true,
    docDate: new Date(),
    requiredDate: base.requiredDate || null,
    usuario_id: base.usuario_id || null,
    destinatario_id: destinatarioId,
    estado: "DRAFT",
  });

  await SolicitudAlmacenLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_almacen_id: consolidada.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: l.quantity,
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId || null,
      paqueteTrabajoId: l.paqueteTrabajoId || null,
    }))
  );

  // Enviar correo
  const resultadoCorreo = await enviarCorreoSolicitudAlmacen({
    destinatarioCorreo: destinatario.correo,
    destinatarioNombre: destinatario.nombre,
    numeroSolicitud: numero,
    otNumero: ot.numeroOT,
    lineas,
  });

  await consolidada.update({
    estado: resultadoCorreo.success ? "SENT" : "ERROR",
  });

  if (resultadoCorreo.success) {
    for (const sa of pendientes) {
      await sa.update({ estado: "SENT" });
    }
  }

  return {
    success: resultadoCorreo.success,
    numeroSolicitud: numero,
    procesadas: pendientes.length,
    correoEnviado: resultadoCorreo.success,
    destinatario: destinatario.correo,
    errorCorreo: resultadoCorreo.success ? null : resultadoCorreo.error,
  };
}

/* =========================================================
   PREVIEW SOLICITUDES
========================================================= */
async function previewSolicitudesOT(ordenTrabajoId) {
  const [solicitudesCompra, solicitudesAlmacen] = await Promise.all([
    SolicitudCompra.findAll({
      where: { ordenTrabajoId },
      include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    }),
    SolicitudAlmacen.findAll({
      where: { ordenTrabajoId },
      include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
    }),
  ]);

  return {
    compra: _fusionarItemsParaVista(solicitudesCompra),
    almacen: _fusionarItemsParaVista(solicitudesAlmacen),
  };
}

function _fusionarItemsParaVista(solicitudes) {
  const mapa = new Map();

  for (const s of solicitudes) {
    for (const l of s.lineas || []) {
      const key = `${l.itemCode}|${l.costingCode || ""}|${l.projectCode || ""}`;

      if (mapa.has(key)) {
        mapa.get(key).quantity += Number(l.quantity);
        mapa.get(key).fuentes.push({
          solicitudId: s.id,
          esGeneral: s.esGeneral,
          equipo_id: s.equipo_id,
          ubicacion_tecnica_id: s.ubicacion_tecnica_id,
          quantity: Number(l.quantity),
        });
      } else {
        mapa.set(key, {
          itemCode: l.itemCode,
          itemId: l.itemId || null,
          description: l.description || "",
          quantity: Number(l.quantity),
          warehouseCode: l.warehouseCode || "01",
          costingCode: l.costingCode || null,
          projectCode: l.projectCode || null,
          rubroId: l.rubroId || null,
          paqueteTrabajoId: l.paqueteTrabajoId || null,
          fuentes: [{
            solicitudId: s.id,
            esGeneral: s.esGeneral,
            equipo_id: s.equipo_id,
            ubicacion_tecnica_id: s.ubicacion_tecnica_id,
            quantity: Number(l.quantity),
          }],
        });
      }
    }
  }

  return {
    totalSolicitudes: solicitudes.length,
    lineas: Array.from(mapa.values()),
  };
}

/* =========================================================
   GENERAR NÚMERO DE SOLICITUD PARA OT
========================================================= */
async function _obtenerOVdeOT(ordenTrabajoId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [{ association: "aviso" }],
  });
  if (!ot) throw new Error("OT no encontrada");

  const aviso = ot.aviso;
  const ov = aviso?.numeroOV || aviso?.ordenVenta || aviso?.ov;

  if (!ov || !String(ov).trim()) {
    throw new Error(
      `El aviso ${aviso?.numeroAviso || ot.avisoId} no tiene número de OV`
    );
  }
  return String(ov).trim();
}

async function _generarNumeroSolicitudOT({ modelo, prefijo, ordenVenta }) {
  const total = await modelo.count({
    where: { numeroSolicitud: { [Op.like]: `${prefijo}-${ordenVenta}-%` } },
  });
  const correlativo = String(total + 1).padStart(3, "0");
  return `${prefijo}-${ordenVenta}-${correlativo}`;
}

/* =========================================================
   GENERAR SOLICITUD COMPRA CONSOLIDADA
========================================================= */
async function generarSolicitudCompraOT(ordenTrabajoId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede generar la solicitud en estado CREADO");
  }

  const yaExiste = await SolicitudCompra.findOne({
    where: { ordenTrabajoId, esConsolidada: true },
  });

  if (yaExiste) {
    return SolicitudCompra.findByPk(yaExiste.id, {
      include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    });
  }

  const solicitudes = await SolicitudCompra.findAll({
    where: { ordenTrabajoId, esConsolidada: false, esCopia: true },
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });

  if (!solicitudes.length) throw new Error("No hay solicitudes de compra en esta OT");

  const { lineas } = _fusionarItemsParaVista(solicitudes);
  if (!lineas.length) throw new Error("No hay líneas válidas para generar la solicitud");

  const ordenVenta = await _obtenerOVdeOT(ordenTrabajoId);
  const numero = await _generarNumeroSolicitudOT({
    modelo: SolicitudCompra,
    prefijo: "SC",
    ordenVenta,
  });

  const base = solicitudes[0];

  const consolidada = await SolicitudCompra.create({
    numeroSolicitud: numero,
    ordenTrabajoId,
    tratamiento_id: base.tratamiento_id,
    esGeneral: true,
    esCopia: false,
    esConsolidada: true,
    docDate: new Date(),
    requiredDate: base.requiredDate,
    usuario_id: base.usuario_id,
    estado: "GENERADA",
  });

  await SolicitudCompraLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_compra_id: consolidada.id,
      itemId: l.itemId,
      itemCode: l.itemCode,
      description: l.description,
      quantity: l.quantity,
      warehouseCode: l.warehouseCode,
      costingCode: l.costingCode,
      projectCode: l.projectCode,
      rubroId: l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );

  return SolicitudCompra.findByPk(consolidada.id, {
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });
}

/* =========================================================
   GENERAR SOLICITUD ALMACÉN CONSOLIDADA
========================================================= */
function _construirMailto({ destinatario, numero, otNumero, lineas }) {
  const subject = encodeURIComponent(
    `Solicitud de Almacén ${numero} - OT ${otNumero}`
  );
  const itemsTexto = lineas
    .map(
      (l, i) =>
        `${i + 1}. [${l.itemCode}] ${l.description} - Cant: ${l.quantity}`
    )
    .join("\n");
  const bodyTexto =
    `Estimados,\n\nSe solicita la entrega de los siguientes materiales para la OT ${otNumero}:\n\n` +
    `${itemsTexto}\n\nNúmero de solicitud: ${numero}\n\nSaludos.`;

  return (
    `mailto:${encodeURIComponent(destinatario)}` +
    `?subject=${subject}` +
    `&body=${encodeURIComponent(bodyTexto)}`
  );
}

async function generarSolicitudAlmacenOT(ordenTrabajoId, { destinatarioId }) {
  if (!destinatarioId) throw new Error("destinatarioId es obligatorio");

  const destinatario = await PersonalCorreo.findByPk(destinatarioId);
  if (!destinatario) throw new Error("Destinatario no encontrado");
  if (!destinatario.correo)
    throw new Error("El destinatario no tiene correo registrado");

  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede generar la solicitud en estado CREADO");
  }

  const yaExiste = await SolicitudAlmacen.findOne({
    where: { ordenTrabajoId, esConsolidada: true },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });

  if (yaExiste) {
    await yaExiste.update({ destinatario_id: destinatarioId });
    const mailtoLink = _construirMailto({
      destinatario: destinatario.correo,
      numero: yaExiste.numeroSolicitud,
      otNumero: ot.numeroOT,
      lineas: yaExiste.lineas,
    });
    return {
      solicitud: await SolicitudAlmacen.findByPk(yaExiste.id, {
        include: [
          { model: SolicitudAlmacenLinea, as: "lineas" },
          { model: PersonalCorreo, as: "destinatario" },
        ],
      }),
      mailtoLink,
    };
  }

  const solicitudes = await SolicitudAlmacen.findAll({
    where: { ordenTrabajoId, esConsolidada: false, esCopia: true },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });

  if (!solicitudes.length)
    throw new Error("No hay solicitudes de almacén en esta OT");

  const { lineas } = _fusionarItemsParaVista(solicitudes);
  if (!lineas.length)
    throw new Error("No hay líneas válidas para generar la solicitud");

  const ordenVenta = await _obtenerOVdeOT(ordenTrabajoId);
  const numero = await _generarNumeroSolicitudOT({
    modelo: SolicitudAlmacen,
    prefijo: "SA",
    ordenVenta,
  });

  const base = solicitudes[0];

  const consolidada = await SolicitudAlmacen.create({
    numeroSolicitud: numero,
    ordenTrabajoId,
    tratamiento_id: base.tratamiento_id,
    esGeneral: true,
    esCopia: false,
    esConsolidada: true,
    docDate: new Date(),
    requiredDate: base.requiredDate,
    usuario_id: base.usuario_id,
    destinatario_id: destinatarioId,
    estado: "DRAFT",
  });

  await SolicitudAlmacenLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_almacen_id: consolidada.id,
      itemId: l.itemId, itemCode: l.itemCode,
      description: l.description, quantity: l.quantity,
      warehouseCode: l.warehouseCode, costingCode: l.costingCode,
      projectCode: l.projectCode, rubroId: l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );

  const solicitudCompleta = await SolicitudAlmacen.findByPk(consolidada.id, {
    include: [
      { model: SolicitudAlmacenLinea, as: "lineas" },
      { model: PersonalCorreo, as: "destinatario" },
    ],
  });

  const mailtoLink = _construirMailto({
    destinatario: destinatario.correo,
    numero, otNumero: ot.numeroOT, lineas,
  });

  return { solicitud: solicitudCompleta, mailtoLink };
}


async function _consolidarSolicitudesAlmacen(ordenTrabajoId, ot, destinatarioId, ccEmails = []) {
  // Normalizar CC
  const ccArray = Array.isArray(ccEmails) ? ccEmails.filter(Boolean) : [];

  // ── Verificar si ya existe una consolidada ──────────
  const yaExiste = await SolicitudAlmacen.findOne({
    where: { ordenTrabajoId, esConsolidada: true },
    include: [
      { model: SolicitudAlmacenLinea, as: "lineas" },
      { model: PersonalCorreo, as: "destinatario" },
    ],
  });

  if (yaExiste) {
    // Actualizar destinatario y CC si cambiaron
    const updateData = {};
    if (destinatarioId && yaExiste.destinatario_id !== destinatarioId) {
      updateData.destinatario_id = destinatarioId;
    }
    if (ccArray.length > 0) updateData.ccEmails = ccArray;
    if (Object.keys(updateData).length) await yaExiste.update(updateData);

    const dest = await PersonalCorreo.findByPk(
      destinatarioId || yaExiste.destinatario_id
    );

    let resultadoCorreo = { success: false, error: "Sin destinatario" };
    if (dest?.correo) {
      resultadoCorreo = await enviarCorreo({
        to: dest.correo,
        cc: ccArray.length > 0 ? ccArray : (yaExiste.ccEmails || []),
        subject: `Solicitud de Almacén ${yaExiste.numeroSolicitud} - OT ${ot.numeroOT}`,
        html: buildHtmlBloque([{ ...yaExiste.toJSON(), lineas: yaExiste.lineas }]),
      });
    }

    return {
      solicitud: yaExiste,
      resultadoCorreo,
      destinatario: dest || null,
    };
  }
 
  // ── Traer solo las copias OT (esCopia: true) DRAFT — excluir el original del tratamiento ──
  const solicitudes = await SolicitudAlmacen.findAll({
    where: { ordenTrabajoId, esConsolidada: false, esCopia: true },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
    order: [["createdAt", "ASC"]],
  });
 
  if (!solicitudes.length) return null;
 
  // ── Fusionar líneas ─────────────────────────────────
  const todasLasLineas = solicitudes.flatMap((s) =>
    (s.lineas || []).map((l) => ({
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: Number(l.quantity || 0),
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId || null,
      paqueteTrabajoId: l.paqueteTrabajoId || null,
    }))
  );
 
  if (!todasLasLineas.length) return null;
 
  // ── Generar número SA-OV-001 ────────────────────────
  const aviso = await Aviso.findByPk(ot.avisoId);
  const ov = aviso?.ordenVenta || aviso?.numeroOV || "OT";
  const total = await SolicitudAlmacen.count({
    where: { numeroSolicitud: { [Op.like]: `SA-${ov}-%` } },
  });
  const numero = `SA-${ov}-${String(total + 1).padStart(3, "0")}`;
 
  const base = solicitudes[0];
 
  // ── Crear la consolidada ────────────────────────────
  const consolidada = await SolicitudAlmacen.create({
    numeroSolicitud: numero,
    ordenTrabajoId,
    tratamiento_id: base.tratamiento_id || null,
    esGeneral: true,
    esCopia: false,
    esConsolidada: true,
    docDate: new Date(),
    requiredDate: base.requiredDate || null,
    usuario_id: base.usuario_id || null,
    destinatario_id: destinatarioId || null,
    ccEmails: ccArray,
    estado: "DRAFT",
  });
 
  await SolicitudAlmacenLinea.bulkCreate(
    todasLasLineas.map((l) => ({
      solicitud_almacen_id: consolidada.id,
      itemId: l.itemId,
      itemCode: l.itemCode,
      description: l.description,
      quantity: l.quantity,
      warehouseCode: l.warehouseCode,
      costingCode: l.costingCode,
      projectCode: l.projectCode,
      rubroId: l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );
 
  // ── Enviar correo automáticamente ──────────────────
  let resultadoCorreo = { success: false, error: "Sin destinatario" };
  let destinatario = null;
 
  if (destinatarioId) {
    destinatario = await PersonalCorreo.findByPk(destinatarioId);
    if (destinatario?.correo) {
      resultadoCorreo = await enviarCorreo({
        to: destinatario.correo,
        cc: ccArray,
        subject: `Solicitud de Almacén ${numero} - OT ${ot.numeroOT}`,
        html: buildHtmlBloque([{
          numeroSolicitud: numero,
          requester: base.requester,
          requiredDate: base.requiredDate,
          lineas: todasLasLineas,
        }]),
      });
    }
  }
 
  const solicitudCompleta = await SolicitudAlmacen.findByPk(consolidada.id, {
    include: [
      { model: SolicitudAlmacenLinea, as: "lineas" },
      { model: PersonalCorreo, as: "destinatario" },
    ],
  });
 
  return {
    solicitud: solicitudCompleta,
    resultadoCorreo,
    destinatario,
  };
}

async function verificarSolicitudesParaLiberar(ordenTrabajoId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO")
    throw new Error("Solo se puede liberar en estado CREADO");
 
  const solicitudesCompra = await SolicitudCompra.findAll({
    where: { ordenTrabajoId, esConsolidada: false },
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });
 
  const solicitudesAlmacen = await SolicitudAlmacen.findAll({
    where: { ordenTrabajoId, esConsolidada: false },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });
 
  const totalLineasCompra = solicitudesCompra.reduce(
    (acc, s) => acc + (s.lineas?.length || 0), 0
  );
  const totalLineasAlmacen = solicitudesAlmacen.reduce(
    (acc, s) => acc + (s.lineas?.length || 0), 0
  );
 
  const destinatariosDisponibles = await PersonalCorreo.findAll({
    attributes: ["id", "nombre", "correo"],
    order: [["nombre", "ASC"]],
  });
 
  return {
    hayCompra: totalLineasCompra > 0,
    hayAlmacen: totalLineasAlmacen > 0,
    totalLineasCompra,
    totalLineasAlmacen,
    destinatariosDisponibles,
  };
}
 
/* =========================================================
   LIBERAR OT
   POST /ordenes-trabajo/:id/liberar
   Body: { destinatarioId?: string }
========================================================= */
async function liberarOrdenTrabajo(id, { destinatarioId = null, ccEmails = [] } = {}) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO")
    throw new Error("Solo se puede liberar en estado CREADO");
 
  const resultado = {
    ot: null,
    compra: {
      consolidada: null,
      numeroSolicitud: null,
      resultadoSAP: null,
      enviada: false,
    },
    almacen: {
      consolidada: null,
      numeroSolicitud: null,
      correoEnviado: false,
      destinatario: null,
      errorCorreo: null,
    },
  };
 
  /* ─── COMPRA → SAP ──────────────────────────────────── */
  const solicitudesCompraDraft = await SolicitudCompra.findAll({
    where: { ordenTrabajoId: id, esConsolidada: false, esCopia: true },
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });
 
  const hayLineasCompra = solicitudesCompraDraft.some(
    (s) => (s.lineas?.length || 0) > 0
  );
 
  if (hayLineasCompra) {
    // Consolidar todas las solicitudes de compra en una sola
    const yaExisteCompra = await SolicitudCompra.findOne({
      where: { ordenTrabajoId: id, esConsolidada: true },
      include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    });
 
    let consolidadaCompra = yaExisteCompra;
 
    if (!consolidadaCompra) {
      // Fusionar todas las líneas
      const todasLineasCompra = solicitudesCompraDraft.flatMap((s) =>
        (s.lineas || []).map((l) => ({
          itemId: l.itemId || null,
          itemCode: l.itemCode,
          description: l.description || "",
          quantity: Number(l.quantity || 0),
          warehouseCode: l.warehouseCode || "01",
          costingCode: l.costingCode || null,
          projectCode: l.projectCode || null,
          rubroId: l.rubroId || null,
          paqueteTrabajoId: l.paqueteTrabajoId || null,
        }))
      );
 
      if (todasLineasCompra.length > 0) {
        // Generar número SC-OV-001
        const aviso = await Aviso.findByPk(ot.avisoId);
        const ov = aviso?.ordenVenta || aviso?.numeroOV || "OT";
        const totalSC = await SolicitudCompra.count({
          where: { numeroSolicitud: { [Op.like]: `SC-${ov}-%` } },
        });
        const numeroSC = `SC-${ov}-${String(totalSC + 1).padStart(3, "0")}`;
 
        const base = solicitudesCompraDraft[0];
        consolidadaCompra = await SolicitudCompra.create({
          numeroSolicitud: numeroSC,
          ordenTrabajoId: id,
          tratamiento_id: base.tratamiento_id || null,
          esGeneral: true,
          esCopia: false,
          esConsolidada: true,
          docDate: new Date(),
          requiredDate: base.requiredDate || null,
          usuario_id: base.usuario_id || null,
          estado: "DRAFT",
        });
 
        await SolicitudCompraLinea.bulkCreate(
          todasLineasCompra.map((l) => ({
            solicitud_compra_id: consolidadaCompra.id,
            itemId: l.itemId,
            itemCode: l.itemCode,
            description: l.description,
            quantity: l.quantity,
            warehouseCode: l.warehouseCode,
            costingCode: l.costingCode,
            projectCode: l.projectCode,
            rubroId: l.rubroId,
            paqueteTrabajoId: l.paqueteTrabajoId,
          }))
        );
 
        consolidadaCompra = await SolicitudCompra.findByPk(consolidadaCompra.id, {
          include: [{ model: SolicitudCompraLinea, as: "lineas" }],
        });
      }
    }
 
    if (consolidadaCompra) {
      resultado.compra.consolidada = consolidadaCompra;
      resultado.compra.numeroSolicitud = consolidadaCompra.numeroSolicitud;
 
      // Enviar a SAP
      const resultadoSAP = await enviarSolicitudCompraASAPDesdeObjeto(
        consolidadaCompra.toJSON()
      );
 
      await consolidadaCompra.update({
        estado: resultadoSAP.success ? "SENT" : "ERROR",
        sapDocNum: resultadoSAP.success ? resultadoSAP.data?.DocNum : null,
      });
 
      resultado.compra.resultadoSAP = resultadoSAP;
      resultado.compra.enviada = resultadoSAP.success;
 
      // Marcar solicitudes originales
      if (resultadoSAP.success) {
        for (const sc of solicitudesCompraDraft) {
          await sc.update({ estado: "SENT" });
        }
      }
    }
  }
 
  /* ─── ALMACÉN → CORREO ──────────────────────────────── */
  const solicitudesAlmacenDraft = await SolicitudAlmacen.findAll({
    where: { ordenTrabajoId: id, esConsolidada: false, esCopia: true },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });
 
  const hayLineasAlmacen = solicitudesAlmacenDraft.some(
    (s) => (s.lineas?.length || 0) > 0
  );
 
  if (hayLineasAlmacen) {
    const resultadoAlmacen = await _consolidarSolicitudesAlmacen(
      id,
      ot,
      destinatarioId,
      ccEmails
    );
 
    if (resultadoAlmacen) {
      const { solicitud, resultadoCorreo, destinatario } = resultadoAlmacen;
 
      resultado.almacen.consolidada = solicitud;
      resultado.almacen.numeroSolicitud = solicitud?.numeroSolicitud || null;
      resultado.almacen.correoEnviado = resultadoCorreo.success;
      resultado.almacen.destinatario = destinatario?.correo || null;
      resultado.almacen.errorCorreo = resultadoCorreo.success
        ? null
        : resultadoCorreo.error;
 
      if (resultadoCorreo.success) {
        await solicitud.update({ estado: "SENT" });
        for (const sa of solicitudesAlmacenDraft) {
          await sa.update({ estado: "SENT" });
        }
      }
    }
  }
 
  /* ─── LIBERAR OT ────────────────────────────────────── */
  await ot.update({ estado: "LIBERADO" });
 
  resultado.ot = await OrdenTrabajo.findByPk(id, {
    include: [
      {
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "ubicacionTecnica" },
          { association: "actividades" },
          { association: "trabajadores", include: ["trabajador"] },
        ],
      },
      { association: "adjuntos" },
    ],
  });
 
  return resultado;
}



/* =========================================================
   CREAR SOLICITUD COMPRA GENERAL NUEVA PARA UNA OT
========================================================= */
async function crearSolicitudCompraGeneralEnOT(ordenTrabajoId, { requiredDate, lineas }, usuarioId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [{ association: "aviso" }],
  });
  if (!ot) throw new Error("OT no encontrada");

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: ot.avisoId },
  });

  const sc = await SolicitudCompra.create({
    tratamiento_id: tratamiento?.id || null,
    ordenTrabajoId,
    esGeneral: true,
    esCopia: false,
    origenSolicitudId: null,
    docDate: new Date(),
    requiredDate,
    usuario_id: usuarioId,
    estado: "DRAFT",
  });

  await SolicitudCompraLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_compra_id: sc.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: Number(l.quantity),
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );

  return SolicitudCompra.findByPk(sc.id, {
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });
}

/* =========================================================
   CREAR SOLICITUD ALMACÉN GENERAL NUEVA PARA UNA OT
========================================================= */
async function crearSolicitudAlmacenGeneralEnOT(ordenTrabajoId, { requiredDate, lineas }, usuarioId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [{ association: "aviso" }],
  });
  if (!ot) throw new Error("OT no encontrada");

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: ot.avisoId },
  });

  const sa = await SolicitudAlmacen.create({
    tratamiento_id: tratamiento?.id || null,
    ordenTrabajoId,
    esGeneral: true,
    esCopia: false,
    origenSolicitudId: null,
    docDate: new Date(),
    requiredDate,
    usuario_id: usuarioId,
    estado: "DRAFT",
  });

  await SolicitudAlmacenLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_almacen_id: sa.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: Number(l.quantity),
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );

  return SolicitudAlmacen.findByPk(sa.id, {
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });
}

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajoCompleta,
  eliminarOrdenTrabajo,
  verificarSolicitudesParaLiberar,
  liberarOrdenTrabajo,
  actualizarOTACierreTecnicoSiCompleta,
  syncSolicitudesCompraOT,
  syncSolicitudesAlmacenOT,
  obtenerSolicitudesPorOT,
  previewSolicitudesOT,
  generarSolicitudCompraOT,
  generarSolicitudAlmacenOT,
  // Nuevas — para el modal de solicitud general pendiente
  obtenerSolicitudesGeneralesPendientes,
  asignarSolicitudGeneralAOT,
  crearSolicitudCompraGeneralEnOT,
  crearSolicitudAlmacenGeneralEnOT,
};