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
  Tratamiento,
  TratamientoEquipo,
  Notificacion,
} = require("../db_connection");


const { enviarSolicitudCompra } = require("../sap/sapSolicitudCompra");
const {
  fusionarSolicitudesParaSap } = require("../controllers/ordenTrabajoDetalleController");
const { Op } = require("sequelize");

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

/* =========================================================
   4) Crear una OT interna
========================================================= */
async function crearOTInterna(
  { aviso, otDataBase, equipos, adjuntos, asignarSolicitudGeneral },
  t
) {
  const countOT = await OrdenTrabajo.count({
    where: { avisoId: aviso.id },
    transaction: t,
  });

  const correlativo = String(countOT + 1).padStart(3, "0");

  const otData = {
    ...otDataBase,
    avisoId: aviso.id,
    numeroOT: `${aviso.numeroAviso}-OT${correlativo}`,
  };

  const ot = await OrdenTrabajo.create(otData, { transaction: t });

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

  await asignarSolicitudesDeTratamientoAOT({
    avisoId: aviso.id,
    otId: ot.id,
    targetsOT,
    asignarGeneral: !!asignarSolicitudGeneral,
    t,
  });

  await copiarActividadesATargetsOT({
    avisoId: aviso.id,
    targetsOT,
    targetsPayload: equipos,
    t,
  });

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
    await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresTarget, {
      transaction: t,
    });
  }

  if (adjuntos && adjuntos.length) {
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
      grupalTargetKeys = [],
      individualTargetKeys = [],
      solicitudGeneralStrategy = "OT_GRUPAL",
      otKeyGeneral = null,
      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");
    if (!Array.isArray(equipos) || equipos.length === 0) {
      throw new Error("Debe enviar al menos un equipo o ubicación técnica");
    }

    for (const equipo of equipos) {
      ensureValidTarget(equipo);
    }

    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento) {
        throw new Error(
          "El aviso de mantenimiento no tiene tipo de mantenimiento"
        );
      }
      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      otData.tipoMantenimiento = null;
    }

    await validarTargetsDelAviso(aviso.id, equipos, t);
    validarActividadesPayload(equipos, otData.tipoMantenimiento);

    const shouldAssignGeneral = (key) => {
      if (solicitudGeneralStrategy === "NINGUNA") return false;
      if (solicitudGeneralStrategy === "OT_GRUPAL") return key === "GRUPAL";
      if (solicitudGeneralStrategy === "PRIMERA_OT") return key === "PRIMERA";
      if (solicitudGeneralStrategy === "OT_ESPECIFICA") return key === otKeyGeneral;
      return false;
    };

    const otsCreadas = [];

    if (!["GRUPAL", "INDIVIDUAL", "MIXTO"].includes(modo)) {
      throw new Error("modo inválido. Use GRUPAL | INDIVIDUAL | MIXTO");
    }

    if (modo === "GRUPAL") {
      const ot = await crearOTInterna(
        {
          aviso,
          otDataBase: otData,
          equipos,
          adjuntos,
          asignarSolicitudGeneral:
            shouldAssignGeneral("GRUPAL") || shouldAssignGeneral("PRIMERA"),
        },
        t
      );

      otsCreadas.push(ot);
    }

    if (modo === "INDIVIDUAL") {
      let primera = true;

      for (const equipo of equipos) {
        const key = getTargetKey(equipo);

        const ot = await crearOTInterna(
          {
            aviso,
            otDataBase: otData,
            equipos: [equipo],
            adjuntos,
            asignarSolicitudGeneral:
              (shouldAssignGeneral("PRIMERA") && primera)
                ? true
                : shouldAssignGeneral(key),
          },
          t
        );

        otsCreadas.push(ot);
        primera = false;
      }
    }

    if (modo === "MIXTO") {
      if (!Array.isArray(grupalTargetKeys) || grupalTargetKeys.length === 0) {
        throw new Error("En MIXTO debe enviar grupalTargetKeys");
      }

      if (!Array.isArray(individualTargetKeys) || individualTargetKeys.length === 0) {
        throw new Error("En MIXTO debe enviar individualTargetKeys");
      }

      const set = new Set([...grupalTargetKeys, ...individualTargetKeys]);
      if (set.size !== grupalTargetKeys.length + individualTargetKeys.length) {
        throw new Error("Un target no puede estar en grupal e individual a la vez");
      }

      const equiposMap = new Map(equipos.map((x) => [getTargetKey(x), x]));

      for (const key of [...grupalTargetKeys, ...individualTargetKeys]) {
        if (!equiposMap.has(key)) {
          throw new Error(`El target ${key} no fue enviado en el payload`);
        }
      }

      const equiposGrupal = grupalTargetKeys.map((key) => equiposMap.get(key));
      const equiposIndividual = individualTargetKeys.map((key) => equiposMap.get(key));

      const otGrupal = await crearOTInterna(
        {
          aviso,
          otDataBase: otData,
          equipos: equiposGrupal,
          adjuntos,
          asignarSolicitudGeneral:
            shouldAssignGeneral("GRUPAL") || shouldAssignGeneral("PRIMERA"),
        },
        t
      );

      otsCreadas.push(otGrupal);

      for (const equipo of equiposIndividual) {
        const key = getTargetKey(equipo);

        const ot = await crearOTInterna(
          {
            aviso,
            otDataBase: otData,
            equipos: [equipo],
            adjuntos,
            asignarSolicitudGeneral: shouldAssignGeneral(key),
          },
          t
        );

        otsCreadas.push(ot);
      }
    }

    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });

    await t.commit();

    return await OrdenTrabajo.findAll({
      where: {
        id: { [Op.in]: otsCreadas.map((x) => x.id) },
      },
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
        { association: "adjuntos" },
      ],
      order: [["createdAt", "DESC"]],
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
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

async function liberarOrdenTrabajo(id) {
  const ot = await OrdenTrabajo.findByPk(id);

  if (!ot) throw new Error("Orden de Trabajo no encontrada");

  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede liberar una OT en estado CREADO");
  }

  /* =========================
     🔥 1. TRAER SOLICITUDES
  ========================= */
  const solicitudes = await SolicitudCompra.findAll({
    where: {
      ordenTrabajoId: id,
    },
    include: [
      {
        model: SolicitudCompraLinea,
        as: "lineas",
        include: [
          { association: "rubro" },
          { association: "paqueteTrabajo" },
        ],
      },
    ],
  });

  const pendientes = solicitudes.filter(
    (s) => s.estado !== "SENT"
  );

  if (!pendientes.length) {
    throw new Error("No hay solicitudes pendientes");
  }

  /* =========================
     🔥 2. FUSIONAR
  ========================= */
  const solicitudFusionada = fusionarSolicitudesParaSap(
    pendientes.map((s) => s.toJSON())
  );

  if (!solicitudFusionada?.lineas?.length) {
    throw new Error("No hay líneas válidas");
  }

  /* =========================
     🔥 3. ENVIAR A SAP
  ========================= */
  const resultado = await enviarSolicitudCompraASAPDesdeObjeto(
    solicitudFusionada
  );

  /* =========================
     🔥 4. ACTUALIZAR
  ========================= */
  for (const solicitud of pendientes) {
    await solicitud.update({
      estado: resultado.success ? "SENT" : "ERROR",
      sapDocNum: resultado.success ? resultado.data.DocNum : null,
    });
  }

  /* =========================
     🔥 5. LIBERAR OT
  ========================= */
  if (resultado.success) {
    await ot.update({ estado: "LIBERADO" });
  }

  return {
    ot,
    resultadoSAP: resultado,
  };
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

module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajoCompleta,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo,
  actualizarOTACierreTecnicoSiCompleta,
};