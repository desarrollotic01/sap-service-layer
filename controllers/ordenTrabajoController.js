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
  PersonalCorreo
} = require("../db_connection");


const { enviarSolicitudCompraASAP,enviarSolicitudCompraASAPDesdeObjeto } = require("../sap/sapSolicitudCompra");
const {
  fusionarSolicitudesParaSap } = require("../controllers/ordenTrabajoDetalleController");
const { Op } = require("sequelize");

const {
  clonarSolicitudesAlmacenATrabajo,
} = require("../controllers/SolicitudAlmacenController");


/* =========================================================
   HELPERS CREAR SOLICITUDES EN OT DESDE PAYLOAD
   (el usuario ya editó/eliminó líneas en el frontend)
========================================================= */

async function _crearSolicitudesCompraEnOT({ ordenTrabajoId, tratamientoId, solicitudes, usuarioId, t }) {
  if (!solicitudes) return;

  const { general, porEquipo = {} } = solicitudes;

  // GENERAL
  if (general && Array.isArray(general.lineas) && general.lineas.length > 0) {
    const sc = await SolicitudCompra.create(
      {
        tratamiento_id: tratamientoId,
        ordenTrabajoId,
        esGeneral: true,
        esCopia: true,
        origenSolicitudId: general.origenSolicitudId || null,
        docDate: new Date(),
        requiredDate: general.requiredDate,
        department: general.department || null,
        requester: general.requester,
        comments: general.comments || null,
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      general.lineas.map((l) => ({
        solicitud_compra_id: sc.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode,
        description: l.description || "",
        quantity: Number(l.quantity),
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );
  }

  // POR EQUIPO / UBICACIÓN
  for (const [key, data] of Object.entries(porEquipo)) {
    if (!data || !Array.isArray(data.lineas) || data.lineas.length === 0) continue;

    const sc = await SolicitudCompra.create(
      {
        tratamiento_id: tratamientoId,
        ordenTrabajoId,
        esGeneral: false,
        esCopia: true,
        origenSolicitudId: data.origenSolicitudId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        docDate: new Date(),
        requiredDate: data.requiredDate,
        department: data.department || null,
        requester: data.requester,
        comments: data.comments || null,
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudCompraLinea.bulkCreate(
      data.lineas.map((l) => ({
        solicitud_compra_id: sc.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode,
        description: l.description || "",
        quantity: Number(l.quantity),
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

async function _crearSolicitudesAlmacenEnOT({ ordenTrabajoId, tratamientoId, solicitudes, usuarioId, t }) {
  if (!solicitudes) return;

  const { SolicitudAlmacen, SolicitudAlmacenLinea } = require("../db_connection");
  const { general, porEquipo = {} } = solicitudes;

  // GENERAL
  if (general && Array.isArray(general.lineas) && general.lineas.length > 0) {
    const sa = await SolicitudAlmacen.create(
      {
        tratamiento_id: tratamientoId,
        ordenTrabajoId,
        esGeneral: true,
        esCopia: true,
        origenSolicitudId: general.origenSolicitudId || null,
        docDate: new Date(),
        requiredDate: general.requiredDate,
        department: general.department || null,
        requester: general.requester,
        comments: general.comments || null,
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.bulkCreate(
      general.lineas.map((l) => ({
        solicitud_almacen_id: sa.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode,
        description: l.description || "",
        quantity: Number(l.quantity),
        warehouseCode: l.warehouseCode || "01",
        costingCode: l.costingCode || null,
        projectCode: l.projectCode || null,
        rubroId: l.rubroId || null,
        paqueteTrabajoId: l.paqueteTrabajoId || null,
      })),
      { transaction: t }
    );
  }

  // POR EQUIPO / UBICACIÓN
  for (const [key, data] of Object.entries(porEquipo)) {
    if (!data || !Array.isArray(data.lineas) || data.lineas.length === 0) continue;

    const sa = await SolicitudAlmacen.create(
      {
        tratamiento_id: tratamientoId,
        ordenTrabajoId,
        esGeneral: false,
        esCopia: true,
        origenSolicitudId: data.origenSolicitudId || null,
        equipo_id: data.equipo_id || null,
        ubicacion_tecnica_id: data.ubicacion_tecnica_id || null,
        docDate: new Date(),
        requiredDate: data.requiredDate,
        department: data.department || null,
        requester: data.requester,
        comments: data.comments || null,
        usuario_id: usuarioId,
        estado: "DRAFT",
      },
      { transaction: t }
    );

    await SolicitudAlmacenLinea.bulkCreate(
      data.lineas.map((l) => ({
        solicitud_almacen_id: sa.id,
        itemId: l.itemId || null,
        itemCode: l.itemCode,
        description: l.description || "",
        quantity: Number(l.quantity),
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


async function manejarSolicitudesEnOT({
  aviso,
  ordenTrabajoId,
  targetsOT,
  usarSolicitudGeneralExistente = false,
  crearSolicitudGeneralNueva = false,
  t,
}) {
  if (usarSolicitudGeneralExistente && crearSolicitudGeneralNueva) {
    throw new Error("No puede usar y crear solicitud general al mismo tiempo");
  }

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: aviso.id },
    transaction: t,
  });

  if (!tratamiento) return;

  const equipoIds = targetsOT.map(x => x.equipoId).filter(Boolean);
  const ubicacionIds = targetsOT.map(x => x.ubicacionTecnicaId).filter(Boolean);

  const where = {
    tratamiento_id: tratamiento.id,
    [Op.or]: [],
  };

  if (equipoIds.length) {
    where[Op.or].push({ equipo_id: { [Op.in]: equipoIds } });
  }

  if (ubicacionIds.length) {
    where[Op.or].push({
      ubicacion_tecnica_id: { [Op.in]: ubicacionIds },
    });
  }

  if (usarSolicitudGeneralExistente) {
    where[Op.or].push({ esGeneral: true });
  }

  const solicitudes = await SolicitudCompra.findAll({
    where,
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    transaction: t,
  });

  /* =========================
     🔥 CLONAR
  ========================= */
  for (const s of solicitudes) {
    const nueva = await SolicitudCompra.create(
      {
        numeroSolicitud: null,
        tratamiento_id: s.tratamiento_id,
        ordenTrabajoId,

        equipo_id: s.equipo_id,
        ubicacion_tecnica_id: s.ubicacion_tecnica_id,
        esGeneral: s.esGeneral,

        origenSolicitudId: s.id,
        esCopia: true,

        docDate: new Date(),
        requiredDate: s.requiredDate,
        department: s.department,
        requester: s.requester,
        comments: s.comments,
        usuario_id: s.usuario_id,

        estado: "DRAFT",
      },
      { transaction: t }
    );

    if (s.lineas?.length) {
      await SolicitudCompraLinea.bulkCreate(
        s.lineas.map((l) => ({
          solicitud_compra_id: nueva.id,
          itemId: l.itemId,
          itemCode: l.itemCode,
          description: l.description,
          quantity: l.quantity,
          warehouseCode: l.warehouseCode,
          costingCode: l.costingCode,
          projectCode: l.projectCode,
          rubroId: l.rubroId,
          paqueteTrabajoId: l.paqueteTrabajoId,
        })),
        { transaction: t }
      );
    }
  }

  /* =========================
     🔥 CREAR GENERAL NUEVA
  ========================= */
  if (crearSolicitudGeneralNueva) {
    await SolicitudCompra.create(
      {
        numeroSolicitud: null,
        tratamiento_id: tratamiento.id,
        ordenTrabajoId,

        equipo_id: null,
        ubicacion_tecnica_id: null,

        esGeneral: true,
        esCopia: true,
        origenSolicitudId: null,

        docDate: new Date(),
        estado: "DRAFT",
      },
      { transaction: t }
    );
  }
}
/* =========================================================
   HELPERS
========================================================= */
const getTargetKey = (target) => {
  if (target?.equipoId) return `E:${String(target.equipoId)}`;
  if (target?.ubicacionTecnicaId) return `U:${String(target.ubicacionTecnicaId)}`;
  return null;
};

const getTargetLabel = (target) => {
  if (target?.equipoId) return `equipo ${target.equipoId}`;
  if (target?.ubicacionTecnicaId) return `ubicación técnica ${target.ubicacionTecnicaId}`;
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
            `Tipo de trabajo inválido en ${getTargetLabel(equipo)}. Solo REPARACION o CAMBIO`
          );
        }
      }
    }
  }
};

/* =========================================================
   1) Asignar Solicitudes a UNA OT
========================================================= */
async function asignarSolicitudesDeTratamientoAOT({
  avisoId,
  otId,
  targetsOT = [],
  asignarGeneral = false,
  t,
}) {
  if (!avisoId) throw new Error("avisoId es obligatorio");
  if (!otId) throw new Error("otId es obligatorio");
  if (!Array.isArray(targetsOT)) {
    throw new Error("targetsOT debe ser un arreglo");
  }

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
    transaction: t,
  });

  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  const equipoIdsOT = targetsOT.map((x) => x.equipoId).filter(Boolean);
  const ubicacionIdsOT = targetsOT.map((x) => x.ubicacionTecnicaId).filter(Boolean);

  if (equipoIdsOT.length) {
    await SolicitudCompra.update(
      { ordenTrabajoId: otId },
      {
        where: {
          tratamiento_id: tratamiento.id,
          esGeneral: false,
          equipo_id: { [Op.in]: equipoIdsOT },
        },
        transaction: t,
      }
    );
  }

  if (ubicacionIdsOT.length) {
    await SolicitudCompra.update(
      { ordenTrabajoId: otId },
      {
        where: {
          tratamiento_id: tratamiento.id,
          esGeneral: false,
          ubicacion_tecnica_id: { [Op.in]: ubicacionIdsOT },
        },
        transaction: t,
      }
    );
  }

  if (asignarGeneral) {
    const general = await SolicitudCompra.findOne({
      where: {
        tratamiento_id: tratamiento.id,
        esGeneral: true,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (general && !general.ordenTrabajoId) {
      await general.update({ ordenTrabajoId: otId }, { transaction: t });
    }
  }

  return { ok: true };
}

/* =========================================================
   2) Copiar actividades a OT
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

  if (keysSinPayload.length > 0) {
    const tratamiento = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

    const equipoIds = targetsOT.map((x) => x.equipoId).filter(Boolean);
    const ubicacionIds = targetsOT.map((x) => x.ubicacionTecnicaId).filter(Boolean);

    const where = {
      tratamientoId: tratamiento.id,
      [Op.or]: [],
    };

    if (equipoIds.length) {
      where[Op.or].push({
        equipoId: { [Op.in]: equipoIds },
      });
    }

    if (ubicacionIds.length) {
      where[Op.or].push({
        ubicacionTecnicaId: { [Op.in]: ubicacionIds },
      });
    }

    if (where[Op.or].length > 0) {
      const tes = await TratamientoEquipo.findAll({
        where,
        include: [{ association: "actividades" }],
        transaction: t,
      });

      const actsByTargetKey = new Map();

      for (const te of tes) {
        const key = getTargetKey(te);
        actsByTargetKey.set(key, te.actividades || []);
      }

      for (const targetOT of targetsOT) {
        const key = getTargetKey(targetOT);
        if (!keysSinPayload.includes(key)) continue;

        const acts = actsByTargetKey.get(key) || [];

        for (const act of acts) {
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
            estado: "PENDIENTE",
            origen: "TRATAMIENTO",
            tratamientoEquipoActividadId: act.tratamientoEquipoActividadId || null,
          });
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
   3) Validar registros pertenezcan al aviso
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
    (aviso.ubicacionesRelacion || []).map(
      (x) => String(x.ubicacionTecnicaId || x.ubicacionId)
    )
  );

  for (const equipo of equipos) {
    ensureValidTarget(equipo);

    if (equipo.equipoId) {
      if (!equipoIdsAviso.has(String(equipo.equipoId))) {
        throw new Error(`El equipo ${equipo.equipoId} no pertenece al aviso`);
      }
    }

    if (equipo.ubicacionTecnicaId) {
      if (!ubicacionIdsAviso.has(String(equipo.ubicacionTecnicaId))) {
        throw new Error(
          `La ubicación técnica ${equipo.ubicacionTecnicaId} no pertenece al aviso`
        );
      }
    }
  }
}


async function crearSolicitudesDesdePayload({
  ordenTrabajoId,
  solicitudes,
  t,
}) {
  const { solicitudGeneral, solicitudesPorEquipo } = solicitudes;

  // GENERAL
  if (solicitudGeneral) {
    const nueva = await SolicitudCompra.create(
      {
        ordenTrabajoId,
        esGeneral: true,
        ...solicitudGeneral,
      },
      { transaction: t }
    );

    if (solicitudGeneral.lineas?.length) {
      await SolicitudCompraLinea.bulkCreate(
        solicitudGeneral.lineas.map((l) => ({
          ...l,
          solicitud_compra_id: nueva.id,
        })),
        { transaction: t }
      );
    }
  }

  // POR EQUIPO
  for (const key in solicitudesPorEquipo) {
    const s = solicitudesPorEquipo[key];

    const nueva = await SolicitudCompra.create(
      {
        ordenTrabajoId,
        esGeneral: false,
        equipo_id: s.targetMeta?.equipo_id || null,
        ubicacion_tecnica_id: s.targetMeta?.ubicacion_tecnica_id || null,
        ...s,
      },
      { transaction: t }
    );

    if (s.lineas?.length) {
      await SolicitudCompraLinea.bulkCreate(
        s.lineas.map((l) => ({
          ...l,
          solicitud_compra_id: nueva.id,
        })),
        { transaction: t }
      );
    }
  }
}

/* =========================================================
   4) Crear una OT interna
========================================================= */
async function crearOTInterna(
  {
    aviso,
    otDataBase,
    equipos,
    adjuntos,
    solicitudesCompra = null,   // 👈 viene del payload (ya editadas por el usuario)
    solicitudesAlmacen = null,  // 👈 idem
    usuarioId = null,
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
        descripcionEquipo: x.descripcionEquipo || x.descripcionUbicacion || null,
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

  // Buscar tratamientoId para las solicitudes
  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: aviso.id },
    transaction: t,
  });

  // ✅ SOLICITUDES DE COMPRA — desde payload (ya editadas)
  if (solicitudesCompra) {
    await _crearSolicitudesCompraEnOT({
      ordenTrabajoId: ot.id,
      tratamientoId: tratamiento?.id || null,
      solicitudes: solicitudesCompra,
      usuarioId,
      t,
    });
  }

  // ✅ SOLICITUDES DE ALMACÉN — desde payload (ya editadas)
  if (solicitudesAlmacen) {
    await _crearSolicitudesAlmacenEnOT({
      ordenTrabajoId: ot.id,
      tratamientoId: tratamiento?.id || null,
      solicitudes: solicitudesAlmacen,
      usuarioId,
      t,
    });
  }

  // Copiar actividades del tratamiento
  await copiarActividadesATargetsOT({
    avisoId: aviso.id,
    targetsOT,
    targetsPayload: equipos,
    t,
  });

  // Trabajadores
  const trabajadoresTarget = [];
  targetsOT.forEach((targetCreado, index) => {
    const trabajadores = equipos[index].trabajadores || [];
    trabajadores.forEach((trab) => {
      trabajadoresTarget.push({
        ordenTrabajoEquipoId: targetCreado.id,
        trabajadorId: trab.trabajadorId,
        esEncargado: trab.esEncargado || false,
      });
    });
  });

  if (trabajadoresTarget.length) {
    await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresTarget, { transaction: t });
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

    if (Array.isArray(payloadEquipo.adjuntos) && payloadEquipo.adjuntos.length) {
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
   5) FUNCIÓN PRINCIPAL: crearOrdenTrabajo
========================================================= */
async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const {
      equipos = [],
      adjuntos = [],
      modo = "GRUPAL",
      solicitudGeneralStrategy = { tipo: "NINGUNA" },
      solicitudesCompra = null,
      solicitudesAlmacen = null,
      usuarioId = null,
      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");
    if (!equipos.length) throw new Error("Debe enviar al menos un equipo o ubicación técnica");

    equipos.forEach(ensureValidTarget);

    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento) throw new Error("El aviso no tiene tipo de mantenimiento");
      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      otData.tipoMantenimiento = null;
    }

    await validarTargetsDelAviso(aviso.id, equipos, t);
    validarActividadesPayload(equipos, otData.tipoMantenimiento);

    const otsCreadas = [];

    /* =========================================================
       🔵 MODO GRUPAL
       - Todo el payload viaja junto
       - La general viaja si el front la mandó (nunca se fuerza)
    ========================================================= */
    if (modo === "GRUPAL") {
      const ot = await crearOTInterna(
        {
          aviso,
          otDataBase: otData,
          equipos,
          adjuntos,
          solicitudesCompra,   // null = sin solicitudes, sin error
          solicitudesAlmacen,  // null = sin solicitudes, sin error
          usuarioId,
        },
        t
      );

      otsCreadas.push(ot);
    }

    /* =========================================================
       🟣 MODO INDIVIDUAL
       - Una OT por equipo
       - La general solo va a la OT cuyo targetKey coincide
       - Si tipo = "NINGUNA", ninguna OT lleva la general
    ========================================================= */
    if (modo === "INDIVIDUAL") {
      const { tipo = "NINGUNA", targetKey = null } = solicitudGeneralStrategy;

      if (tipo === "ASIGNAR" && !targetKey) {
        throw new Error("Debe enviar targetKey para asignar la solicitud general");
      }

      for (const equipo of equipos) {
        const key = getTargetKey(equipo);
        const esLaQueRecibeLaGeneral = tipo === "ASIGNAR" && key === targetKey;

        // ── Compra ──────────────────────────────────────────
        let solicitudesCompraParaOT = null;

        if (solicitudesCompra) {
          const datoPorEquipo = solicitudesCompra.porEquipo?.[key] ?? null;
          const generalParaOT  = esLaQueRecibeLaGeneral
            ? (solicitudesCompra.general ?? null)
            : null;

          // Solo construir el objeto si hay algo que meter
          if (generalParaOT || datoPorEquipo) {
            solicitudesCompraParaOT = {
              general: generalParaOT,
              porEquipo: datoPorEquipo ? { [key]: datoPorEquipo } : {},
            };
          }
        }

        // ── Almacén ─────────────────────────────────────────
        let solicitudesAlmacenParaOT = null;

        if (solicitudesAlmacen) {
          const datoPorEquipo = solicitudesAlmacen.porEquipo?.[key] ?? null;
          const generalParaOT  = esLaQueRecibeLaGeneral
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
            solicitudesCompra: solicitudesCompraParaOT,   // puede ser null → sin error
            solicitudesAlmacen: solicitudesAlmacenParaOT, // puede ser null → sin error
            usuarioId,
          },
          t
        );

        otsCreadas.push(ot);
      }
    }

    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });
    await t.commit();



  } catch (error) {
    await t.rollback();
    throw error;
  }

  return await OrdenTrabajo.findAll({
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
    });
}

async function obtenerOrdenesTrabajo() {
  return await OrdenTrabajo.findAll({
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
    ],
  });
}

async function obtenerOrdenTrabajoPorId(id) {
  return await OrdenTrabajo.findByPk(id, {
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
}

async function actualizarOrdenTrabajoCompleta(id, data) {
  const transaction = await sequelize.transaction();

  try {
    const ot = await OrdenTrabajo.findByPk(id, { transaction });

    if (!ot) {
      await transaction.rollback();
      return null;
    }

    /* =========================
       1. ACTUALIZAR OT PRINCIPAL
    ========================= */
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
      "id"
    ];

    const dataOT = {};

    for (const campo of camposOTPermitidos) {
      if (data[campo] !== undefined) {
        dataOT[campo] = data[campo];
      }
    }

    await ot.update(dataOT, { transaction });

    /* =========================
       2. ADJUNTOS GENERALES OT
    ========================= */
    if (Array.isArray(data.adjuntos)) {
      const adjuntosActualesOT = await Adjunto.findAll({
        where: { ordenTrabajoId: id, ordenTrabajoEquipoId: null },
        transaction,
      });

      const idsAdjuntosPayloadOT = data.adjuntos
        .filter((a) => a.id)
        .map((a) => a.id);

      for (const adjuntoActual of adjuntosActualesOT) {
        if (!idsAdjuntosPayloadOT.includes(adjuntoActual.id)) {
          await adjuntoActual.destroy({ transaction });
        }
      }

      for (const adjunto of data.adjuntos) {
        const payloadAdjuntoOT = {
          nombre: adjunto.nombre,
          url: adjunto.url,
          extension: adjunto.extension ?? null,
          categoria: adjunto.categoria ?? null,
          mostrarEnPortal: adjunto.mostrarEnPortal ?? false,
          tituloPortal: adjunto.tituloPortal ?? null,
          descripcionPortal: adjunto.descripcionPortal ?? null,
          ordenPortal: adjunto.ordenPortal ?? 0,
          ordenTrabajoId: id,
          ordenTrabajoEquipoId: null,
        };

        if (adjunto.id) {
          const existente = await Adjunto.findOne({
            where: {
              id: adjunto.id,
              ordenTrabajoId: id,
              ordenTrabajoEquipoId: null,
            },
            transaction,
          });

          if (existente) {
            await existente.update(payloadAdjuntoOT, { transaction });
          } else {
            await Adjunto.create(
              {
                id: adjunto.id,
                ...payloadAdjuntoOT,
              },
              { transaction }
            );
          }
        } else {
          await Adjunto.create(payloadAdjuntoOT, { transaction });
        }
      }
    }

    /* =========================
       3. EQUIPOS
    ========================= */
    if (Array.isArray(data.equipos)) {
      const equiposActuales = await OrdenTrabajoEquipo.findAll({
        where: { ordenTrabajoId: id },
        transaction,
      });

      const idsEquiposPayload = data.equipos.filter((e) => e.id).map((e) => e.id);

      for (const equipoActual of equiposActuales) {
        if (!idsEquiposPayload.includes(equipoActual.id)) {
          await OrdenTrabajoEquipoTrabajador.destroy({
            where: { ordenTrabajoEquipoId: equipoActual.id },
            transaction,
          });

          await OrdenTrabajoEquipoActividad.destroy({
            where: { ordenTrabajoEquipoId: equipoActual.id },
            transaction,
          });

          await Adjunto.destroy({
            where: { ordenTrabajoEquipoId: equipoActual.id },
            transaction,
          });

          await equipoActual.destroy({ transaction });
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

        let equipoGuardado = null;

        if (equipo.id) {
          equipoGuardado = await OrdenTrabajoEquipo.findOne({
            where: {
              id: equipo.id,
              ordenTrabajoId: id,
            },
            transaction,
          });

          if (equipoGuardado) {
            await equipoGuardado.update(payloadEquipo, { transaction });
          } else {
            equipoGuardado = await OrdenTrabajoEquipo.create(
              {
                id: equipo.id,
                ...payloadEquipo,
              },
              { transaction }
            );
          }
        } else {
          equipoGuardado = await OrdenTrabajoEquipo.create(payloadEquipo, {
            transaction,
          });
        }

        /* =========================
           4. TRABAJADORES POR EQUIPO
        ========================= */
        if (Array.isArray(equipo.trabajadores)) {
          const trabajadoresActuales = await OrdenTrabajoEquipoTrabajador.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id },
            transaction,
          });

          const idsTrabajadoresPayload = equipo.trabajadores
            .filter((t) => t.id)
            .map((t) => t.id);

          for (const trabajadorActual of trabajadoresActuales) {
            if (!idsTrabajadoresPayload.includes(trabajadorActual.id)) {
              await trabajadorActual.destroy({ transaction });
            }
          }

          for (const trabajador of equipo.trabajadores) {
            const payloadTrabajador = {
              ordenTrabajoEquipoId: equipoGuardado.id,
              trabajadorId: trabajador.trabajadorId,
              esEncargado: trabajador.esEncargado ?? false,
            };

            if (trabajador.id) {
              const existente = await OrdenTrabajoEquipoTrabajador.findOne({
                where: {
                  id: trabajador.id,
                  ordenTrabajoEquipoId: equipoGuardado.id,
                },
                transaction,
              });

              if (existente) {
                await existente.update(payloadTrabajador, { transaction });
              } else {
                await OrdenTrabajoEquipoTrabajador.create(
                  {
                    id: trabajador.id,
                    ...payloadTrabajador,
                  },
                  { transaction }
                );
              }
            } else {
              await OrdenTrabajoEquipoTrabajador.create(payloadTrabajador, {
                transaction,
              });
            }
          }
        }

        /* =========================
           5. ACTIVIDADES POR EQUIPO
        ========================= */
        if (Array.isArray(equipo.actividades)) {
          const actividadesActuales = await OrdenTrabajoEquipoActividad.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id },
            transaction,
          });

          const idsActividadesPayload = equipo.actividades
            .filter((a) => a.id)
            .map((a) => a.id);

          for (const actividadActual of actividadesActuales) {
            if (!idsActividadesPayload.includes(actividadActual.id)) {
              await actividadActual.destroy({ transaction });
            }
          }

          for (const actividad of equipo.actividades) {
            const payloadActividad = {
              ordenTrabajoEquipoId: equipoGuardado.id,
              planMantenimientoActividadId:
                actividad.planMantenimientoActividadId ?? null,
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
              tratamientoEquipoActividadId:
                actividad.tratamientoEquipoActividadId ?? null,
              observaciones: actividad.observaciones ?? null,
            };

            if (actividad.id) {
              const existente = await OrdenTrabajoEquipoActividad.findOne({
                where: {
                  id: actividad.id,
                  ordenTrabajoEquipoId: equipoGuardado.id,
                },
                transaction,
              });

              if (existente) {
                await existente.update(payloadActividad, { transaction });
              } else {
                await OrdenTrabajoEquipoActividad.create(
                  {
                    id: actividad.id,
                    ...payloadActividad,
                  },
                  { transaction }
                );
              }
            } else {
              await OrdenTrabajoEquipoActividad.create(payloadActividad, {
                transaction,
              });
            }
          }
        }

        /* =========================
           6. ADJUNTOS POR EQUIPO
        ========================= */
        if (Array.isArray(equipo.adjuntos)) {
          const adjuntosActualesEquipo = await Adjunto.findAll({
            where: { ordenTrabajoEquipoId: equipoGuardado.id },
            transaction,
          });

          const idsAdjuntosPayloadEquipo = equipo.adjuntos
            .filter((a) => a.id)
            .map((a) => a.id);

          for (const adjuntoActual of adjuntosActualesEquipo) {
            if (!idsAdjuntosPayloadEquipo.includes(adjuntoActual.id)) {
              await adjuntoActual.destroy({ transaction });
            }
          }

          for (const adjunto of equipo.adjuntos) {
            const payloadAdjuntoEquipo = {
              nombre: adjunto.nombre,
              url: adjunto.url,
              extension: adjunto.extension ?? null,
              categoria: adjunto.categoria ?? null,
              mostrarEnPortal: adjunto.mostrarEnPortal ?? false,
              tituloPortal: adjunto.tituloPortal ?? null,
              descripcionPortal: adjunto.descripcionPortal ?? null,
              ordenPortal: adjunto.ordenPortal ?? 0,
              ordenTrabajoId: null,
              ordenTrabajoEquipoId: equipoGuardado.id,
            };

            if (adjunto.id) {
              const existente = await Adjunto.findOne({
                where: {
                  id: adjunto.id,
                  ordenTrabajoEquipoId: equipoGuardado.id,
                },
                transaction,
              });

              if (existente) {
                await existente.update(payloadAdjuntoEquipo, { transaction });
              } else {
                await Adjunto.create(
                  {
                    id: adjunto.id,
                    ...payloadAdjuntoEquipo,
                  },
                  { transaction }
                );
              }
            } else {
              await Adjunto.create(payloadAdjuntoEquipo, { transaction });
            }
          }
        }
      }
    }

    await transaction.commit();

    const otActualizada = await OrdenTrabajo.findByPk(id, {
      include: [
        {
          model: OrdenTrabajoEquipo,
          as: "equipos",
          include: [
            {
              model: OrdenTrabajoEquipoTrabajador,
              as: "trabajadores",
            },
            {
              model: OrdenTrabajoEquipoActividad,
              as: "actividades",
            },
            {
              model: Adjunto,
              as: "adjuntos",
            },
          ],
        },
        {
          model: Adjunto,
          as: "adjuntos",
        },
      ],
    });

    return otActualizada;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}


async function eliminarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null; 

  await Adjunto.destroy({ where: { ordenTrabajoId: id } });
  await OrdenTrabajoEquipo.destroy({ where: { ordenTrabajoId: id } });
  await ot.destroy();

  return true;
}



/* =========================================================
   6) CAMBIAR A CIERRE_TECNICO SI TODAS TIENEN NOTIFICACION
========================================================= */
async function actualizarOTACierreTecnicoSiCompleta(ordenTrabajoId, transaction) {
  if (!ordenTrabajoId) {
    throw new Error("ordenTrabajoId es obligatorio");
  }

  const totalRegistrosOT = await OrdenTrabajoEquipo.count({
    where: { ordenTrabajoId },
    transaction,
  });

  if (!totalRegistrosOT) {
    return {
      ok: false,
      changed: false,
      totalRegistrosOT: 0,
      totalNotificaciones: 0,
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
      {
        where: { id: ordenTrabajoId },
        transaction,
      }
    );

    return {
      ok: true,
      changed: true,
      totalRegistrosOT,
      totalNotificaciones,
    };
  }

  return {
    ok: true,
    changed: false,
    totalRegistrosOT,
    totalNotificaciones,
  };
}


async function syncSolicitudesCompraOT(id) {
  const ot = await OrdenTrabajo.findByPk(id);

  if (!ot) throw new Error("OT no encontrada");

  const solicitudes = await SolicitudCompra.findAll({
    where: { ordenTrabajoId: id },
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });

  const pendientes = solicitudes.filter(
    (s) => s.estado === "DRAFT" || s.estado === "ERROR"
  );

  if (!pendientes.length) {
    throw new Error("No hay solicitudes pendientes para sync");
  }

  const solicitudFusionada = fusionarSolicitudesParaSap(
    pendientes.map((s) => s.toJSON())
  );

  let resultado;

  if (!solicitudFusionada?.lineas?.length) {
    resultado = {
      success: false,
      message: "Sin líneas válidas",
    };
  } else {
    resultado = await enviarSolicitudCompraASAPDesdeObjeto(
      solicitudFusionada
    );
  }

  for (const solicitud of pendientes) {
    await solicitud.update({
      estado: resultado.success ? "SENT" : "ERROR",
      sapDocNum: resultado.success ? resultado.data?.DocNum : null,
    });
  }

  return {
    success: resultado.success,
    procesadas: pendientes.length,
  };
}


async function _obtenerOVdeOT(ordenTrabajoId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId, {
    include: [{ association: "aviso" }],
  });

  if (!ot) throw new Error("OT no encontrada");

  const aviso = ot.aviso;
  const ov = aviso?.numeroOV || aviso?.ordenVenta || aviso?.ov;

  if (!ov || !String(ov).trim()) {
    throw new Error(`El aviso ${aviso?.numeroAviso || ot.avisoId} no tiene número de OV`);
  }

  return String(ov).trim();
}

// ordenTrabajoController.js

async function previewSolicitudesOT(ordenTrabajoId) {
  const { SolicitudAlmacen, SolicitudAlmacenLinea } = require("../db_connection");

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
    compra:  _fusionarItemsParaVista(solicitudesCompra),
    almacen: _fusionarItemsParaVista(solicitudesAlmacen),
  };
}

// Fusiona líneas de TODAS las solicitudes, sumando por itemCode
// Si tienen distinto costingCode/projectCode → líneas separadas
function _fusionarItemsParaVista(solicitudes) {
  // key = itemCode + "|" + (costingCode||"") + "|" + (projectCode||"")
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
          itemCode:    l.itemCode,
          itemId:      l.itemId || null,
          description: l.description || "",
          quantity:    Number(l.quantity),
          warehouseCode: l.warehouseCode || "01",
          costingCode:   l.costingCode || null,
          projectCode:   l.projectCode || null,
          rubroId:       l.rubroId || null,
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

async function generarSolicitudCompraOT(ordenTrabajoId) {
  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede generar la solicitud en estado CREADO");
  }

  // Verificar que no exista ya una consolidada
  const yaExiste = await SolicitudCompra.findOne({
    where: { ordenTrabajoId, esConsolidada: true },
  });

  if (yaExiste) {
    // Devolver la existente en vez de lanzar error
    return await SolicitudCompra.findByPk(yaExiste.id, {
      include: [{ model: SolicitudCompraLinea, as: "lineas" }],
    });
  }

  const solicitudes = await SolicitudCompra.findAll({
    where: { ordenTrabajoId, esConsolidada: false },
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
    numeroSolicitud:  numero,
    ordenTrabajoId,
    tratamiento_id:   base.tratamiento_id,
    esGeneral:        true,
    esCopia:          false,
    esConsolidada:    true,
    docDate:          new Date(),
    requiredDate:     base.requiredDate,
    requester:        base.requester,
    department:       base.department,
    comments:         base.comments,
    usuario_id:       base.usuario_id,
    estado:           "GENERADA",
  });

  await SolicitudCompraLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_compra_id: consolidada.id,
      itemId:           l.itemId,
      itemCode:         l.itemCode,
      description:      l.description,
      quantity:         l.quantity,
      warehouseCode:    l.warehouseCode,
      costingCode:      l.costingCode,
      projectCode:      l.projectCode,
      rubroId:          l.rubroId,
      paqueteTrabajoId: l.paqueteTrabajoId,
    }))
  );

  return await SolicitudCompra.findByPk(consolidada.id, {
    include: [{ model: SolicitudCompraLinea, as: "lineas" }],
  });
}

function _construirMailto({ destinatario, numero, otNumero, lineas }) {
  const subject = encodeURIComponent(
    `Solicitud de Almacén ${numero} - OT ${otNumero}`
  );

  const itemsTexto = lineas
    .map((l, i) => `${i + 1}. [${l.itemCode}] ${l.description} - Cant: ${l.quantity}`)
    .join("\n");

  const bodyTexto = 
    `Estimados,\n\n` +
    `Se solicita la entrega de los siguientes materiales para la OT ${otNumero}:\n\n` +
    `${itemsTexto}\n\n` +
    `Número de solicitud: ${numero}\n\n` +
    `Saludos.`;

  return `mailto:${encodeURIComponent(destinatario)}` +
    `?subject=${subject}` +
    `&body=${encodeURIComponent(bodyTexto)}`;
}

async function generarSolicitudAlmacenOT(ordenTrabajoId, { destinatarioId }) {

  if (!destinatarioId) throw new Error("destinatarioId es obligatorio");

  // Verificar que el destinatario existe
  const destinatario = await PersonalCorreo.findByPk(destinatarioId);
  if (!destinatario) throw new Error("Destinatario no encontrado");
  if (!destinatario.correo) throw new Error("El destinatario no tiene correo registrado");

  const ot = await OrdenTrabajo.findByPk(ordenTrabajoId);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede generar la solicitud en estado CREADO");
  }

  // Si ya existe consolidada, actualizar destinatario y regenerar mailto
  const yaExiste = await SolicitudAlmacen.findOne({
    where: { ordenTrabajoId, esConsolidada: true },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });

  if (yaExiste) {
    await yaExiste.update({ destinatario_id: destinatarioId });

    const mailtoLink = _construirMailto({
      destinatario: destinatario.correo,
      numero:       yaExiste.numeroSolicitud,
      otNumero:     ot.numeroOT,
      lineas:       yaExiste.lineas,
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

  // Traer solicitudes DRAFT para fusionar
  const solicitudes = await SolicitudAlmacen.findAll({
    where: { ordenTrabajoId, esConsolidada: false },
    include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
  });

  if (!solicitudes.length) throw new Error("No hay solicitudes de almacén en esta OT");

  const { lineas } = _fusionarItemsParaVista(solicitudes);
  if (!lineas.length) throw new Error("No hay líneas válidas para generar la solicitud");

  const ordenVenta = await _obtenerOVdeOT(ordenTrabajoId);
  const numero = await _generarNumeroSolicitudOT({
    modelo: SolicitudAlmacen,
    prefijo: "SA",
    ordenVenta,
  });

  const base = solicitudes[0];

  const consolidada = await SolicitudAlmacen.create({
    numeroSolicitud:  numero,
    ordenTrabajoId,
    tratamiento_id:   base.tratamiento_id,
    esGeneral:        true,
    esCopia:          false,
    esConsolidada:    true,
    docDate:          new Date(),
    requiredDate:     base.requiredDate,
    requester:        base.requester,
    department:       base.department,
    comments:         base.comments,
    usuario_id:       base.usuario_id,
    destinatario_id:  destinatarioId,   // 👈 FK a PersonalCorreo
    estado:           "DRAFT",          // no va a SAP, pero mantenemos el enum
  });

  await SolicitudAlmacenLinea.bulkCreate(
    lineas.map((l) => ({
      solicitud_almacen_id: consolidada.id,
      itemId:           l.itemId,
      itemCode:         l.itemCode,
      description:      l.description,
      quantity:         l.quantity,
      warehouseCode:    l.warehouseCode,
      costingCode:      l.costingCode,
      projectCode:      l.projectCode,
      rubroId:          l.rubroId,
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
    numero,
    otNumero: ot.numeroOT,
    lineas,
  });

  return { solicitud: solicitudCompleta, mailtoLink };
}

async function liberarOrdenTrabajo(id) {

  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) throw new Error("OT no encontrada");
  if (ot.estado !== "CREADO") throw new Error("Solo se puede liberar en estado CREADO");

  /* ── COMPRA → SAP ─────────────────────────────────── */
  const scConsolidada = await SolicitudCompra.findOne({
    where: { ordenTrabajoId: id, esConsolidada: true, estado: "GENERADA" },
    include: [
      {
        model: SolicitudCompraLinea,
        as: "lineas",
        include: [{ association: "rubro" }, { association: "paqueteTrabajo" }],
      },
    ],
  });

  let resultadoSAP = { success: true, message: "Sin solicitud de compra" };

  if (scConsolidada) {
    resultadoSAP = await enviarSolicitudCompraASAPDesdeObjeto(scConsolidada.toJSON());

    await scConsolidada.update({
      estado:    resultadoSAP.success ? "SENT"  : "ERROR",
      sapDocNum: resultadoSAP.success ? resultadoSAP.data?.DocNum : null,
    });
  }

  /* ── ALMACÉN → Outlook ────────────────────────────── */
  const saConsolidada = await SolicitudAlmacen.findOne({
    where: { ordenTrabajoId: id, esConsolidada: true },
    include: [
      { model: SolicitudAlmacenLinea, as: "lineas" },
      { model: PersonalCorreo, as: "destinatario" },
    ],
  });

  let mailtoLink = null;

  if (saConsolidada?.destinatario?.correo) {
    mailtoLink = _construirMailto({
      destinatario: saConsolidada.destinatario.correo,
      numero:       saConsolidada.numeroSolicitud,
      otNumero:     ot.numeroOT,
      lineas:       saConsolidada.lineas,
    });

    // Marcar como enviada (en términos del sistema)
    await saConsolidada.update({ estado: "SENT" });
  }

  /* ── LIBERAR ──────────────────────────────────────── */
  await ot.update({ estado: "LIBERADO" });

  return {
    ot,
    resultadoSAP,
    mailtoAlmacen: mailtoLink,
  };
}



module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajoCompleta,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo,
  actualizarOTACierreTecnicoSiCompleta,
  syncSolicitudesCompraOT,
  obtenerSolicitudesPorOT,
  previewSolicitudesOT,
  generarSolicitudCompraOT,
  generarSolicitudAlmacenOT,
};