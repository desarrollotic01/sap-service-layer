// scripts/seed_planes_mantenimiento.js
// Ejecutar: node scripts/seed_planes_mantenimiento.js

require("dotenv").config();

const {
  sequelize,
  Equipo,
  PlanMantenimiento,
  PlanMantenimientoActividad,
} = require("../db_connection");

/* ======================================================
   CREA PLAN + ACTIVIDADES (SIN DUPLICAR)
====================================================== */
async function upsertPlanConActividades(
  equipoId,
  planPayload,
  actividadesPayload,
  transaction
) {
  let plan = await PlanMantenimiento.findOne({
    where: { equipoId, nombre: planPayload.nombre },
    transaction,
  });

  if (!plan) {
    plan = await PlanMantenimiento.create(
      { ...planPayload, equipoId },
      { transaction }
    );
    console.log("   ✔ Plan creado:", plan.nombre);
  }

  for (const a of actividadesPayload) {
    const exists = await PlanMantenimientoActividad.findOne({
      where: {
        planMantenimientoId: plan.id,
        componente: a.componente,
        tarea: a.tarea,
      },
      transaction,
    });

    if (!exists) {
      await PlanMantenimientoActividad.create(
        {
          planMantenimientoId: plan.id,
          componente: a.componente,
          tarea: a.tarea,
          tipoTrabajo: a.tipoTrabajo,
          frecuencia: a.frecuencia || "MENSUAL", // ⭐ CAMPO OBLIGATORIO
          duracionMinutos: a.duracionMinutos,
          cantidadTecnicos: a.cantidadTecnicos,
        },
        { transaction }
      );
    }
  }
}

/* ======================================================
   PLANTILLAS INDUSTRIALES (TIPO FRACTAL)
====================================================== */
const templates = {
  GENERAL: {
    plans: [
      { nombre: "Preventivo General", tipo: "PREVENTIVO", activo: true },
    ],
    actividades: {
      "Preventivo General": [
        {
          componente: "Inspección",
          tarea: "Inspección visual general",
          tipoTrabajo: "INSPECCION",
          frecuencia: "MENSUAL",
          duracionMinutos: 20,
          cantidadTecnicos: 1,
        },
        {
          componente: "Limpieza",
          tarea: "Limpieza general del equipo",
          tipoTrabajo: "LIMPIEZA",
          frecuencia: "MENSUAL",
          duracionMinutos: 15,
          cantidadTecnicos: 1,
        },
        {
          componente: "Fijaciones",
          tarea: "Ajuste de tornillería",
          tipoTrabajo: "AJUSTE",
          frecuencia: "TRIMESTRAL",
          duracionMinutos: 15,
          cantidadTecnicos: 1,
        },
      ],
    },
  },

  MOTOR_BOMBA: {
    plans: [
      { nombre: "Preventivo Motor/Bomba", tipo: "PREVENTIVO", activo: true },
    ],
    actividades: {
      "Preventivo Motor/Bomba": [
        {
          componente: "Rodamientos",
          tarea: "Revisión y lubricación",
          tipoTrabajo: "LUBRICACION",
          frecuencia: "MENSUAL",
          duracionMinutos: 40,
          cantidadTecnicos: 1,
        },
        {
          componente: "Alineación",
          tarea: "Verificar alineación",
          tipoTrabajo: "REVISION",
          frecuencia: "TRIMESTRAL",
          duracionMinutos: 40,
          cantidadTecnicos: 1,
        },
        {
          componente: "Motor",
          tarea: "Medición vibraciones",
          tipoTrabajo: "INSPECCION",
          frecuencia: "SEMESTRAL",
          duracionMinutos: 60,
          cantidadTecnicos: 2,
        },
      ],
    },
  },

  TABLERO: {
    plans: [
      { nombre: "Preventivo Tablero Eléctrico", tipo: "PREVENTIVO", activo: true },
    ],
    actividades: {
      "Preventivo Tablero Eléctrico": [
        {
          componente: "Bornes",
          tarea: "Ajuste de conexiones",
          tipoTrabajo: "REVISION",
          frecuencia: "TRIMESTRAL",
          duracionMinutos: 30,
          cantidadTecnicos: 1,
        },
        {
          componente: "Protecciones",
          tarea: "Prueba de disyuntores",
          tipoTrabajo: "INSPECCION",
          frecuencia: "SEMESTRAL",
          duracionMinutos: 30,
          cantidadTecnicos: 1,
        },
        {
          componente: "Interior tablero",
          tarea: "Limpieza interna",
          tipoTrabajo: "LIMPIEZA",
          frecuencia: "TRIMESTRAL",
          duracionMinutos: 20,
          cantidadTecnicos: 1,
        },
      ],
    },
  },
};

/* ======================================================
   MAIN
====================================================== */
async function main() {
  console.log("🚀 Seed planes de mantenimiento — inicio");

  await sequelize.authenticate();

  const equipos = await Equipo.findAll();
  console.log("Equipos encontrados:", equipos.length);

  for (const equipo of equipos) {
    const t = await sequelize.transaction();

    try {
      console.log("\nProcesando equipo:", equipo.nombre);

      const texto = (equipo.nombre + " " + equipo.tipo).toUpperCase();
      let selectedTemplates = [];

      if (texto.includes("COMPRESOR") || texto.includes("MOTOR") || texto.includes("BOMBA"))
        selectedTemplates.push(templates.MOTOR_BOMBA);

      if (texto.includes("TABLERO"))
        selectedTemplates.push(templates.TABLERO);

      if (selectedTemplates.length === 0)
        selectedTemplates.push(templates.GENERAL);

      for (const tpl of selectedTemplates) {
        for (const plan of tpl.plans) {
          const actividades = tpl.actividades[plan.nombre] || [];
          await upsertPlanConActividades(equipo.id, plan, actividades, t);
        }
      }

      await t.commit();
      console.log("   ✔ OK");
    } catch (err) {
      await t.rollback();
      console.error("❌ Error:", err.message);
    }
  }

  console.log("\n🎉 Seed completado correctamente");
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
