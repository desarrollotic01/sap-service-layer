const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  Aviso,
  sequelize,
  Adjunto,
  OrdenTrabajoEquipoTrabajador,
  OrdenTrabajoEquipoActividad,
  SolicitudCompra,
  Tratamiento,
  TratamientoEquipo,
  Notificacion,
} = require("../db_connection");

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
      "Cada target debe tener solo equipoId o solo ubicacionTecnicaId"
    );
  }
};

const validarActividadesPayload = (targets = [], tipoMantenimiento = null) => {
  for (const target of targets) {
    const actividades = Array.isArray(target.actividades) ? target.actividades : [];

    if (tipoMantenimiento === "Correctivo") {
      if (!actividades.length) {
        throw new Error(
          `El target ${getTargetLabel(target)} debe tener al menos una actividad`
        );
      }

      for (const act of actividades) {
        if (!act.tarea || !String(act.tarea).trim()) {
          throw new Error(
            `Hay una actividad sin tarea en ${getTargetLabel(target)}`
          );
        }

        if (
          act.tipoTrabajo &&
          !["REPARACION", "CAMBIO"].includes(act.tipoTrabajo)
        ) {
          throw new Error(
            `Tipo de trabajo inválido en ${getTargetLabel(target)}. Solo REPARACION o CAMBIO`
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
   - si vienen en payload, usa esas
   - si no vienen, copia desde tratamiento
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
          codigoActividad: act.codigoActividad || null,
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
          observaciones: act.observaciones || null,
          estado: act.estado || "PENDIENTE",
          origen: act.origen || "OT",
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
            codigoActividad: act.codigoActividad || null,
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
            observaciones: act.observaciones || null,
            estado: "PENDIENTE",
            origen: "TRATAMIENTO",
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
   3) Validar targets pertenezcan al aviso
========================================================= */
async function validarTargetsDelAviso(avisoId, targets, t) {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("Debe enviar al menos un target");
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
    (aviso.ubicacionesRelacion || []).map((x) => String(x.ubicacionId))
  );

  for (const target of targets) {
    ensureValidTarget(target);

    if (target.equipoId) {
      if (!equipoIdsAviso.has(String(target.equipoId))) {
        throw new Error(`El equipo ${target.equipoId} no pertenece al aviso`);
      }
    }

    if (target.ubicacionTecnicaId) {
      if (!ubicacionIdsAviso.has(String(target.ubicacionTecnicaId))) {
        throw new Error(
          `La ubicación técnica ${target.ubicacionTecnicaId} no pertenece al aviso`
        );
      }
    }
  }
}

/* =========================================================
   4) Crear una OT interna
========================================================= */
async function crearOTInterna(
  { aviso, otDataBase, targets, adjuntos, asignarSolicitudGeneral },
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
    targets.map((x) => {
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
        observacionesEquipo: x.observacionesEquipo || null,
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
    targetsPayload: targets,
    t,
  });

  const trabajadoresTarget = [];

  targetsOT.forEach((targetCreado, index) => {
    const trabajadores = targets[index].trabajadores || [];

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
        tipo: a.tipo,
        ordenTrabajoId: ot.id,
      })),
      { transaction: t }
    );
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
      targets,
      adjuntos = [],
      modo = "GRUPAL",
      grupalTargetKeys = [],
      individualTargetKeys = [],
      solicitudGeneralStrategy = "OT_GRUPAL",
      otKeyGeneral = null,
      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");
    if (!Array.isArray(targets) || targets.length === 0) {
      throw new Error("Debe enviar al menos un target");
    }

    for (const target of targets) {
      ensureValidTarget(target);
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

    await validarTargetsDelAviso(aviso.id, targets, t);
    validarActividadesPayload(targets, otData.tipoMantenimiento);

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
          targets,
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

      for (const target of targets) {
        const key = getTargetKey(target);

        const ot = await crearOTInterna(
          {
            aviso,
            otDataBase: otData,
            targets: [target],
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

      const targetsMap = new Map(targets.map((x) => [getTargetKey(x), x]));

      for (const key of [...grupalTargetKeys, ...individualTargetKeys]) {
        if (!targetsMap.has(key)) {
          throw new Error(`El target ${key} no fue enviado en el payload`);
        }
      }

      const targetsGrupal = grupalTargetKeys.map((key) => targetsMap.get(key));
      const targetsIndividual = individualTargetKeys.map((key) => targetsMap.get(key));

      const otGrupal = await crearOTInterna(
        {
          aviso,
          otDataBase: otData,
          targets: targetsGrupal,
          adjuntos,
          asignarSolicitudGeneral:
            shouldAssignGeneral("GRUPAL") || shouldAssignGeneral("PRIMERA"),
        },
        t
      );

      otsCreadas.push(otGrupal);

      for (const target of targetsIndividual) {
        const key = getTargetKey(target);

        const ot = await crearOTInterna(
          {
            aviso,
            otDataBase: otData,
            targets: [target],
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

async function actualizarOrdenTrabajo(id, data) {
  const ot = await OrdenTrabajo.findByPk(id);
  if (!ot) return null;

  await ot.update(data);
  return ot;
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

  await ot.update({ estado: "LIBERADO" });
  return ot;
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
  actualizarOrdenTrabajo,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo,
  actualizarOTACierreTecnicoSiCompleta,
};