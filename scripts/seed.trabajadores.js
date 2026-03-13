/**
 * Script de carga inicial
 * Ejecutar: node scripts/seed.base.js
 */

require("dotenv").config();

const {

  Trabajador,
  Familia,
  Pais,
} = require("../db_connection");

/* =========================
   SEED
========================= */
async function seedBase() {
  try {
    console.log("🔌 Usando conexión existente...");

    /* =========================
       PAISES
    ========================= */
    const paisesData = [
      { codigo: "001", nombre: "PERU" },
      { codigo: "002", nombre: "COLOMBIA" },
      { codigo: "003", nombre: "MEXICO" },
      { codigo: "004", nombre: "GUATEMALA" },
    ];

    const paises = [];

    for (const p of paisesData) {
      const [pais] = await Pais.findOrCreate({
        where: { codigo: p.codigo },
        defaults: p,
      });
      paises.push(pais);
    }

    console.log("🌎 Paises OK");



    /* =========================
       FAMILIAS
    ========================= */
    const familiasData = [
      { nombre: "Cortinas de Aire" },
      { nombre: "Montacargas" },
      { nombre: "Rampas" },
      { nombre: "Puertas Seleccionales" },
      { nombre: "Traspaletas" },
      { nombre: "Apiladores" },
      { nombre: "Puertas Peatonales" },
      { nombre: "OTROS" },
    ];

    const familias = [];

    for (const f of familiasData) {
      const [familia] = await Familia.findOrCreate({
        where: { nombre: f.nombre },
        defaults: f,
      });
      familias.push(familia);
    }

    console.log("🧩 Familias OK");

  
    /* =========================
       TRABAJADORES
    ========================= */
    const trabajadores = [
      {
        nombre: "Luis",
        apellido: "Torres",
        dni: "45678912",
        rol: "tecnico_electrico",
        empresa: "Interno",
      },
      {
        nombre: "Mario",
        apellido: "Ramírez",
        dni: "45678913",
        rol: "tecnico_electrico",
        empresa: "Interno",
      },
      {
        nombre: "Lucio",
        apellido: "Fernández",
        dni: "45678914",
        rol: "tecnico_electrico",
        empresa: "Interno",
      },
      {
        nombre: "Victor",
        apellido: "Santos",
        dni: "45678915",
        rol: "tecnico_electrico",
        empresa: "Interno",
      },
      {
        nombre: "Aldair",
        apellido: "Mendoza",
        dni: "45678916",
        rol: "tecnico_electrico",
        empresa: "Interno",
      },

      {
        nombre: "Carlos",
        apellido: "Gómez",
        dni: "47891234",
        rol: "tecnico_mecanico",
        empresa: "Interno",
      },
      {
        nombre: "Junior",
        apellido: "Vargas",
        dni: "47891235",
        rol: "tecnico_mecanico",
        empresa: "Interno",
      },
      {
        nombre: "Eduardo",
        apellido: "Silva",
        dni: "47891236",
        rol: "tecnico_mecanico",
        empresa: "Interno",
      },
      {
        nombre: "Miguel",
        apellido: "Hernández",
        dni: "47891237",
        rol: "tecnico_mecanico",
        empresa: "Interno",
      },
      {
        nombre: "Oscar",
        apellido: "Ramírez",
        dni: "47891238",
        rol: "tecnico_mecanico",
        empresa: "Interno",
      },

      {
        nombre: "Roy",
        apellido: "García",
        dni: "48912345",
        rol: "operario_de_mantenimiento",
        empresa: "Contratista SAC",
      },
      {
        nombre: "Luis",
        apellido: "Torres Medina",
        dni: "48912346",
        rol: "operario_de_mantenimiento",
        empresa: "Contratista SAC",
      },
      {
        nombre: "Jean",
        apellido: "Perez",
        dni: "48912347",
        rol: "operario_de_mantenimiento",
        empresa: "Contratista SAC",
      },
      {
        nombre: "Andres",
        apellido: "Gonzalez",
        dni: "48912348",
        rol: "operario_de_mantenimiento",
        empresa: "Contratista SAC",
      },
      {
        nombre: "Sebastian",
        apellido: "Nuñez",
        dni: "48912349",
        rol: "supervisor",
        empresa: "Contratista SAC",
      },
    ];

    for (const t of trabajadores) {
      await Trabajador.findOrCreate({
        where: { dni: t.dni },
        defaults: t,
      });
    }

    console.log("👷 Trabajadores OK");

    console.log("🎉 SEED COMPLETADO CORRECTAMENTE");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seedBase();