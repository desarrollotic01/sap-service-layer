const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  AvisoEquipo,
  Aviso,
  sequelize,
  Adjunto,
   OrdenTrabajoEquipoTrabajador,
   planesMantenimiento,
   OrdenTrabajoEquipoActividad,
  PlanMantenimientoActividad
} = require("../db_connection");

const { Op } = require("sequelize");


// ✅ PREVENTIVO — corregido duracionMinutos
async function generarActividadesPreventivas(ot, equiposOT, t) {
  if (ot.tipoMantenimiento !== "Preventivo") return;

  const planIds = [
    ...new Set(equiposOT.map((e) => e.planMantenimientoId).filter(Boolean)),
  ];
  if (!planIds.length) return;

  const actividadesPlan = await PlanMantenimientoActividad.findAll({
    where: { planMantenimientoId: { [Op.in]: planIds } },
    transaction: t,
  });

  const actividadesPorPlan = {};
  for (const act of actividadesPlan) {
    if (!actividadesPorPlan[act.planMantenimientoId])
      actividadesPorPlan[act.planMantenimientoId] = [];
    actividadesPorPlan[act.planMantenimientoId].push(act);
  }

  const actividadesCrear = [];
  for (const equipoOT of equiposOT) {
    const actsPlan = actividadesPorPlan[equipoOT.planMantenimientoId] || [];
    for (const act of actsPlan) {
      actividadesCrear.push({
        ordenTrabajoEquipoId: equipoOT.id,
        planMantenimientoActividadId: act.id,
        componente: act.componente,
        tarea: act.tarea,
        tipoTrabajo: act.tipoTrabajo,
        duracionEstimadaMin: act.duracionMinutos, // ✅ fix
        estado: "PENDIENTE",
        origen: "PLAN",                           // ✅ fix
      });
    }
  }

  if (actividadesCrear.length > 0)
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, { transaction: t });
}

// ✅ CORRECTIVO — actividades manuales
async function generarActividadesCorrectivas(ot, equiposOT, equiposData, t) {
  if (ot.tipoMantenimiento !== "Correctivo") return;

  const actividadesCrear = [];

  equiposOT.forEach((equipoOT, index) => {
    const actividades = equiposData[index]?.actividades || [];

    actividades.forEach((act) => {
      actividadesCrear.push({
        ordenTrabajoEquipoId: equipoOT.id,
        planMantenimientoActividadId: null,
        componente: act.componente || null,
        tarea: act.tarea || null,
        tipoTrabajo: act.tipoTrabajo || "REVISION",
        duracionEstimadaMin: act.duracionEstimadaMin
          ? parseInt(act.duracionEstimadaMin)
          : null,
        estado: "PENDIENTE",
        origen: "MANUAL",  // ✅
      });
    });
  });

  if (actividadesCrear.length > 0)
    await OrdenTrabajoEquipoActividad.bulkCreate(actividadesCrear, { transaction: t });
}

async function crearOrdenTrabajo(data) {
  const t = await sequelize.transaction();

  try {
    const { equipos, adjuntos, ...otData } = data;

    if (!equipos || equipos.length === 0) {
      throw new Error("La orden de trabajo debe tener al menos un equipo");
    }

    // =============================
    // 1️⃣ Obtener aviso
    // =============================
    const aviso = await Aviso.findByPk(otData.avisoId, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    // 🔥 HEREDAR tipo mantenimiento (si aplica)
    if (aviso.tipoAviso === "mantenimiento") {
      if (!aviso.tipoMantenimiento) {
        throw new Error(
          "El aviso de mantenimiento no tiene tipo de mantenimiento"
        );
      }

      otData.tipoMantenimiento = aviso.tipoMantenimiento;
    } else {
      // instalación no usa mantenimiento
      otData.tipoMantenimiento = null;
    }

    // =============================
    // 2️⃣ Contar OTs del aviso
    // =============================
    const countOT = await OrdenTrabajo.count({
      where: { avisoId: aviso.id },
      transaction: t,
    });

    // =============================
    // 3️⃣ Validar equipos del aviso
    // =============================
    const equiposAviso = await AvisoEquipo.findAll({
      where: {
        avisoId: aviso.id,
        equipoId: equipos.map((e) => e.equipoId),
      },
      transaction: t,
    });

    if (equiposAviso.length !== equipos.length) {
      throw new Error("Uno o más equipos no pertenecen al aviso");
    }

    // =============================
    // 4️⃣ Generar número OT
    // =============================
    const correlativo = String(countOT + 1).padStart(3, "0");
    otData.numeroOT = `${aviso.numeroAviso}-OT${correlativo}`;

    // =============================
    // 5️⃣ Crear OT
    // =============================
    const ot = await OrdenTrabajo.create(otData, { transaction: t });

    // =============================
    // 6️⃣ Crear equipos OT (🔥 AQUÍ ESTÁ LA INTELIGENCIA)
    // =============================
    const equiposOT = await OrdenTrabajoEquipo.bulkCreate(
      equipos.map((e) => {
        let planId = e.planMantenimientoId || null;

        

        // =============================
        // 🔵 CASO INSTALACIÓN
        // =============================
        if (aviso.tipoAviso === "instalacion") {
          planId = null; // nunca usa plan
        }

        // =============================
        // 🟢 PREVENTIVO → requiere plan
        // =============================
        if (
          aviso.tipoAviso === "mantenimiento" &&
          aviso.tipoMantenimiento === "Preventivo"
        ) {
          if (!planId) {
            throw new Error(
              "Para mantenimiento preventivo debe seleccionar un plan"
            );
          }
        }

        // =============================
        // 🔴 CORRECTIVO → plan opcional
        // =============================
        // (no hacemos nada — permitido)

        return {
          ordenTrabajoId: ot.id,
          equipoId: e.equipoId,
          descripcionEquipo: e.descripcionEquipo,
          tipoActividad: e.tipoActividad,
          prioridad: e.prioridad,
          planMantenimientoId: planId,
          fechaInicioProgramada: e.fechaInicioProgramada,
          fechaFinProgramada: e.fechaFinProgramada,
        };
      }),
      { transaction: t, returning: true }
    );

    // =============================
// 🔟 GENERAR ACTIVIDADES PREVENTIVAS
// =============================
await generarActividadesPreventivas(ot, equiposOT, t);

await generarActividadesCorrectivas(ot, equiposOT, equipos, t);
    // =============================
    // 7️⃣ Trabajadores por equipo
    // =============================
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

    if (trabajadoresEquipo.length > 0) {
      await OrdenTrabajoEquipoTrabajador.bulkCreate(trabajadoresEquipo, {
        transaction: t,
      });
    }

    // =============================
    // 8️⃣ Adjuntos OT
    // =============================
    if (adjuntos && adjuntos.length > 0) {
      const adjuntosOT = adjuntos.map((a) => ({
        nombre: a.nombre,
        url: a.url,
        tipo: a.tipo,
        ordenTrabajoId: ot.id,
      }));

      await Adjunto.bulkCreate(adjuntosOT, { transaction: t });
    }

    // =============================
    // 9️⃣ Cambiar estado aviso
    // =============================
    await aviso.update({ estadoAviso: "con OT" }, { transaction: t });

    await t.commit();

    return await OrdenTrabajo.findByPk(ot.id, {
      include: [
        {
          association: "equipos",
          include: [{ association: "equipo" }],
        },
        { association: "adjuntos" },
      ],
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
        ]
      },
      {
        association: "adjuntos" 
      }
    ]
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

      // 🔥 ESTA ES LA CLAVE
      {
        association: "actividades",
      },
    ],
  },
  { association: "adjuntos" },
]

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

  if (!ot) {
    throw new Error("Orden de Trabajo no encontrada");
  }

  if (ot.estado !== "CREADO") {
    throw new Error("Solo se puede liberar una OT en estado CREADO");
  }

  await ot.update({
    estado: "LIBERADO"
  });

  return ot;
}

module.exports = {
  crearOrdenTrabajo,
  obtenerOrdenesTrabajo,
  obtenerOrdenTrabajoPorId,
  actualizarOrdenTrabajo,
  eliminarOrdenTrabajo,
  liberarOrdenTrabajo

};
