const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  AvisoEquipo,
  Aviso,
  sequelize,
  Adjunto,
  OrdenTrabajoEquipoTrabajador,
  OrdenTrabajoEquipoActividad,
  SolicitudCompra,
  Tratamiento,
  TratamientoEquipo,
} = require("../db_connection");

const { Op } = require("sequelize");

/* =========================================================
   1) Asignar Solicitudes a UNA OT (solo EQUIPOS)
   - individuales: por equipoId IN equipos OT
   - general: opcional, SOLO si está libre (sin ordenTrabajoId)
========================================================= */
async function asignarSolicitudesDeTratamientoAOT({
  avisoId,
  otId,
  equipoIdsOT = [],
  asignarGeneral = false,
  t,
}) {
  if (!avisoId) throw new Error("avisoId es obligatorio");
  if (!otId) throw new Error("otId es obligatorio");
  if (!Array.isArray(equipoIdsOT)) throw new Error("equipoIdsOT debe ser un arreglo");

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
    transaction: t,
  });
  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  // 1) Individuales por equipos presentes en esta OT
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

  // 2) General (solo si tú decides y está libre)
  if (asignarGeneral) {
    const general = await SolicitudCompra.findOne({
      where: { tratamiento_id: tratamiento.id, esGeneral: true },
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
   2) Copiar actividades SIEMPRE desde TRATAMIENTO
   - preventivo y correctivo
   - respeta duraciones/roles/cantidadTecnicos editadas en tratamiento
========================================================= */
async function copiarActividadesDesdeTratamiento({ avisoId, equiposOT, t }) {
  if (!Array.isArray(equiposOT) || equiposOT.length === 0) return;

  const tratamiento = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
    transaction: t,
  });
  if (!tratamiento) throw new Error("No existe tratamiento para este aviso");

  // Traer TE + actividades para esos equipos
  const tes = await TratamientoEquipo.findAll({
    where: {
      tratamientoId: tratamiento.id,
      equipoId: { [Op.in]: equiposOT.map((e) => e.equipoId) },
    },
    include: [{ association: "actividades" }], // alias debe existir
    transaction: t,
  });

  const actsByEquipoId = new Map();
  for (const te of tes) {
    actsByEquipoId.set(te.equipoId, te.actividades || []);
  }

  const actividadesCrear = [];

  for (const equipoOT of equiposOT) {
    const acts = actsByEquipoId.get(equipoOT.equipoId) || [];

    // si quieres estricto: OT no debe crearse sin actividades en tratamiento
    // if (acts.length === 0) throw new Error(`El equipo ${equipoOT.equipoId} no tiene actividades en tratamiento`);

    for (const act of acts) {
      actividadesCrear.push({
        ordenTrabajoEquipoId: equipoOT.id,

        // trazabilidad (opcional si tienes columna):
        // tratamientoEquipoActividadId: act.id,

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

  if (actividadesCrear.length) {
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, { transaction: t });
  }
}

/* =========================================================
   helper: validar equipos pertenezcan al aviso
========================================================= */
async function validarEquiposDelAviso(avisoId, equipos, t) {
  const equiposAviso = await AvisoEquipo.findAll({
    where: {
      avisoId,
      equipoId: equipos.map((e) => e.equipoId),
    },
    transaction: t,
  });

  if (equiposAviso.length !== equipos.length) {
    throw new Error("Uno o más equipos no pertenecen al aviso");
  }
}

/* =========================================================
   OT interna (crea 1 OT con sus equipos, solicitudes, actividades, trabajadores, adjuntos)
   - parametro: asignarSolicitudGeneral (true/false) decide si esta OT recibe la general
========================================================= */
async function crearOTInterna({ aviso, otDataBase, equipos, adjuntos, asignarSolicitudGeneral }, t) {
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

  // 1) crear OT
  const ot = await OrdenTrabajo.create(otData, { transaction: t });

  // 2) crear equipos OT
  const equiposOT = await OrdenTrabajoEquipo.bulkCreate(
    equipos.map((e) => {
      // En tu nuevo flujo, el plan solo es referencia/visual.
      // Las actividades se copiarán SIEMPRE del tratamiento.
      // Igual puedes guardar planMantenimientoId si viene (para reportes).
      let planId = e.planMantenimientoId || null;

      // Correctivo: puede venir null
      // Preventivo: puede venir planId, pero no lo usaremos para generar actividades
      return {
        ordenTrabajoId: ot.id,
        equipoId: e.equipoId,
        descripcionEquipo: e.descripcionEquipo || null,
        prioridad: e.prioridad || "MEDIA",
        planMantenimientoId: planId,
        fechaInicioProgramada: e.fechaInicioProgramada || null,
        fechaFinProgramada: e.fechaFinProgramada || null,
        observacionesEquipo: e.observacionesEquipo || null,
      };
    }),
    { transaction: t, returning: true }
  );

  // 3) asignar solicitudes (individuales siempre, general según estrategia)
  await asignarSolicitudesDeTratamientoAOT({
    avisoId: aviso.id,
    otId: ot.id,
    equipoIdsOT: equiposOT.map((x) => x.equipoId),
    asignarGeneral: !!asignarSolicitudGeneral,
    t,
  });

  // 4) copiar actividades SIEMPRE desde TRATAMIENTO
  await copiarActividadesDesdeTratamiento({
    avisoId: aviso.id,
    equiposOT,
    t,
  });

  // 5) trabajadores por equipo
  const trabajadoresEquipo = [];
  equiposOT.forEach((equipoCreado, index) => {
    const trabajadores = equipos[index].trabajadores || [];
    trabajadores.forEach((trab) => {
      trabajadoresEquipo.push({
        ordenTrabajoEquipoId: equipoCreado.id,
        trabajadorId: trab.trabajadorId,
        esEncargado: trab.esEncargado || false,
      });
    });
  });

  if (trabajadoresEquipo.length) {
    await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresEquipo, { transaction: t });
  }

  // 6) adjuntos OT
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
   ✅ FUNCIÓN PRINCIPAL: crearOrdenTrabajo
   - soporta GRUPAL / INDIVIDUAL / MIXTO
   - estrategia para solicitud GENERAL:
       "NINGUNA" | "OT_GRUPAL" | "PRIMERA_OT" | "OT_ESPECIFICA"
     otKeyGeneral: (solo si OT_ESPECIFICA) "GRUPAL" o "E:<equipoId>"
========================================================= */
async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const {
      equipos,
      adjuntos = [],
      modo = "GRUPAL", // GRUPAL | INDIVIDUAL | MIXTO

      // MIXTO
      grupalEquipoIds = [],
      individualEquipoIds = [],

      // 🔥 NUEVO: estrategia para asignar solicitud GENERAL
      solicitudGeneralStrategy = "OT_GRUPAL",
      otKeyGeneral = null,

      ...otData
    } = data;

    if (!otData.avisoId) throw new Error("avisoId es obligatorio");
    if (!Array.isArray(equipos) || equipos.length === 0) throw new Error("Debe enviar al menos un equipo");

    // 1) obtener aviso
    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    // 2) heredar tipo mantenimiento
    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento) throw new Error("El aviso de mantenimiento no tiene tipo de mantenimiento");
      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      otData.tipoMantenimiento = null;
    }

    // 3) validar equipos del aviso
    await validarEquiposDelAviso(aviso.id, equipos, t);

    // helper para decidir si esta OT recibe la general
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

    // =========================
    // GRUPAL
    // =========================
    if (modo === "GRUPAL") {
      const ot = await crearOTInterna({
        aviso,
        otDataBase: otData,
        equipos,
        adjuntos,
        asignarSolicitudGeneral: shouldAssignGeneral("GRUPAL") || shouldAssignGeneral("PRIMERA"),
      }, t);

      otsCreadas.push(ot);
    }

    // =========================
    // INDIVIDUAL
    // =========================
    if (modo === "INDIVIDUAL") {
      let primera = true;

      for (const e of equipos) {
        const key = `E:${e.equipoId}`;

        const ot = await crearOTInterna({
          aviso,
          otDataBase: otData,
          equipos: [e],
          adjuntos,
          asignarSolicitudGeneral:
            shouldAssignGeneral("PRIMERA") && primera
              ? true
              : shouldAssignGeneral(key),
        }, t);

        otsCreadas.push(ot);
        primera = false;
      }
    }

    // =========================
    // MIXTO
    // =========================
    if (modo === "MIXTO") {
      if (!Array.isArray(grupalEquipoIds) || grupalEquipoIds.length === 0) {
        throw new Error("En MIXTO debe enviar grupalEquipoIds");
      }
      if (!Array.isArray(individualEquipoIds) || individualEquipoIds.length === 0) {
        throw new Error("En MIXTO debe enviar individualEquipoIds");
      }

      // sin duplicados
      const set = new Set([...grupalEquipoIds, ...individualEquipoIds]);
      if (set.size !== grupalEquipoIds.length + individualEquipoIds.length) {
        throw new Error("Un equipo no puede estar en grupal e individual a la vez");
      }

      // validar que existan en payload
      const idsPayload = new Set(equipos.map((x) => x.equipoId));
      for (const id of [...grupalEquipoIds, ...individualEquipoIds]) {
        if (!idsPayload.has(id)) throw new Error(`El equipo ${id} no fue enviado en el payload`);
      }

      const equiposGrupal = equipos.filter((e) => grupalEquipoIds.includes(e.equipoId));
      const equiposIndividual = equipos.filter((e) => individualEquipoIds.includes(e.equipoId));

      // 1 OT grupal
      const otGrupal = await crearOTInterna({
        aviso,
        otDataBase: otData,
        equipos: equiposGrupal,
        adjuntos,
        asignarSolicitudGeneral: shouldAssignGeneral("GRUPAL") || shouldAssignGeneral("PRIMERA"),
      }, t);

      otsCreadas.push(otGrupal);

      // individuales
      let primera = false; // ya existe una OT (grupal) => PRIMERA ya consumida
      for (const e of equiposIndividual) {
        const key = `E:${e.equipoId}`;

        const ot = await crearOTInterna({
          aviso,
          otDataBase: otData,
          equipos: [e],
          adjuntos,
          asignarSolicitudGeneral:
            (shouldAssignGeneral("PRIMERA") && primera) ? true : shouldAssignGeneral(key),
        }, t);

        otsCreadas.push(ot);
        primera = false;
      }
    }

    // 5) estado aviso
    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });

    await t.commit();

    return await OrdenTrabajo.findAll({
      where: { id: { [Op.in]: otsCreadas.map((x) => x.id) } },
      include: [
        {
          association: "equipos",
          include: [
            { association: "equipo" },
            { association: "planMantenimiento" },
            { association: "actividades" },
            { association: "trabajadores", include: ["trabajador"] },
          ],
        },
        { association: "solicitudesCompra" }, // ahora aquí verás individuales + (general si se asignó)
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
        association: "equipos",
        include: [
          { association: "equipo" },
          { association: "planMantenimiento" },
          { association: "actividades" },
          { association: "trabajadores", include: ["trabajador"] },
        ],
      },
      { association: "adjuntos" },
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

module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajo,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo,
};