/**
 * Script de carga inicial
 * Ejecutar: node scripts/seed.base.js
 */

require("dotenv").config();

const {
  UbicacionTecnica,
  Equipo,
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
      { nombre: "Puertas" },
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
       UBICACIONES TECNICAS
    ========================= */
    const ubicacionesTecnicasData = [
      {
        codigo: "UT-001",
        nombre: "Sala Eléctrica Principal",
        id_cliente: "CLI-UT-001",
        clienteId: clientes[0].id,
        tipoEquipoPropiedad: "Vendido",
        paisId: paises[0].id, // PERU
        sede: "Lima",
        almacen: "Almacén Central",
        operadorLogistico: "DHL",
        idPlaca: "UT-PLACA-001",
        numeroOV: "OV-2001",
        fechaOV: "2025-02-01",
        numeroOrdenCliente: "OC-UT-1001",
        fechaOrdenCliente: "2025-01-28",
        descripcion: "Ubicación técnica destinada a tableros y distribución eléctrica principal",
        fechaEntregaPrevista: "2025-03-15",
        fechaEntregaReal: "2025-03-20",
        finGarantia: "2026-03-20",
        especialidad: "Eléctrico",
      },
      {
        codigo: "UT-002",
        nombre: "Cuarto de Comunicaciones Piso 1",
        id_cliente: "CLI-UT-002",
        clienteId: clientes[0].id,
        tipoEquipoPropiedad: "Vendido",
        paisId: paises[0].id, // PERU
        sede: "Lima",
        almacen: "Almacén Central",
        operadorLogistico: "DHL",
        idPlaca: "UT-PLACA-002",
        numeroOV: "OV-2002",
        fechaOV: "2025-02-05",
        numeroOrdenCliente: "OC-UT-1002",
        fechaOrdenCliente: "2025-02-01",
        descripcion: "Ubicación técnica para equipos de comunicaciones y datos",
        fechaEntregaPrevista: "2025-03-18",
        fechaEntregaReal: "2025-03-25",
        finGarantia: "2026-03-25",
        especialidad: "Datos y Comunicaciones",
      },
      {
        codigo: "UT-003",
        nombre: "Sala HVAC Técnica",
        id_cliente: "CLI-UT-003",
        clienteId: clientes[1].id,
        tipoEquipoPropiedad: "Atendido",
        paisId: paises[0].id, // PERU
        sede: "Arequipa",
        almacen: "Almacén Sur",
        operadorLogistico: "Shalom",
        idPlaca: "UT-PLACA-003",
        numeroOV: "OV-2003",
        fechaOV: "2025-02-10",
        numeroOrdenCliente: "OC-UT-1003",
        fechaOrdenCliente: "2025-02-06",
        descripcion: "Ubicación técnica para operación y control HVAC",
        fechaEntregaPrevista: "2025-03-22",
        fechaEntregaReal: "2025-03-28",
        finGarantia: "2026-03-28",
        especialidad: "HVAC",
      },
    ];

    for (const ut of ubicacionesTecnicasData) {
      await UbicacionTecnica.findOrCreate({
        where: { codigo: ut.codigo },
        defaults: ut,
      });
    }

    console.log("📍 Ubicaciones Técnicas OK");

    /* =========================
       EQUIPOS
    ========================= */
    const equiposData = [
      {
        codigo: "EQ-001",
        numeroOV: "OV-1001",
        fechaOV: "2025-01-10",
        numeroOrdenCliente: "OC-9001",
        fechaOrdenCliente: "2025-01-05",

        clienteId: clientes[0].id,
        paisId: paises[0].id,

        id_cliente: "CLI-EQ-001",

        sede: "Lima",
        almacen: "Almacén Central",
        operadorLogistico: "DHL",

        status: "Almacen",

        idPlaca: "ABC-123",

        nombre: "Control de Acceso Vehicular",
        descripcion: "Equipo de control de acceso vehicular",

        marca: "ZKTeco",
        modelo: "ProAccess X",
        serie: "SERIE-0001",

        tipoEquipoPropiedad: "Vendido",

        fechaEntregaPrevista: "2025-02-15",
        estado: "No instalado",
        finGarantia: "2026-02-15",

        familiaId: familias[0].id,
        tipoEquipo: "Controlador",
        linea: "Acceso",

        creadoPor: "seed",
      },
      {
        codigo: "EQ-002",
        numeroOV: "OV-1002",
        fechaOV: "2025-01-12",
        numeroOrdenCliente: "OC-9002",
        fechaOrdenCliente: "2025-01-08",

        clienteId: clientes[1].id,
        paisId: paises[0].id,

        id_cliente: "CLI-EQ-002",

        sede: "Arequipa",
        almacen: "Almacén Sur",
        operadorLogistico: "Shalom",

        status: "En compra",

        idPlaca: "XYZ-789",

        nombre: "GPS Vehicular",
        descripcion: "GPS para monitoreo vehicular",

        marca: "Teltonika",
        modelo: "FMB920",
        serie: "SERIE-0002",

        tipoEquipoPropiedad: "Vendido",

        fechaEntregaPrevista: "2025-03-01",
        estado: "No instalado",
        finGarantia: "2026-03-01",

        familiaId: familias[1].id,
        tipoEquipo: "Rastreador",
        linea: "Autosat",

        creadoPor: "seed",
      },
    ];

    for (const e of equiposData) {
      await Equipo.findOrCreate({
        where: { codigo: e.codigo },
        defaults: e,
      });
    }

    console.log("⚙️ Equipos OK");

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