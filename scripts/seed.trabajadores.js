/**
 * Script de carga inicial
 * Ejecutar: node scripts/seed.base.js
 */

require("dotenv").config();

const {
  Cliente,
  Contacto,
  UbicacionTecnica,
  Equipo,
  Trabajador,
  Familia,
  Pais
} = require("../db_connection");

/* =========================
   SEED
========================= */
async function seedBase() {
  try {
    console.log("🔌 Usando conexión existente...");



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
       CLIENTES
    ========================= */
    const clientesData = [
      {
        razonSocial: "Arquitectos Unidos SAC",
        ruc: "20123456789",
        direccion: "Av. Primavera 123",
        telefono: "999888777",
        correo: "contacto@arquitectos.com",
        tipoCliente: "Corporativo",
      },
      {
        razonSocial: "Constructora Andina SRL",
        ruc: "20456789123",
        direccion: "Jr. Los Andes 456",
        telefono: "988777666",
        correo: "info@andina.com",
        tipoCliente: "Corporativo",
      },
    ];

    const clientes = [];

    for (const c of clientesData) {
      const [cliente] = await Cliente.findOrCreate({
        where: { ruc: c.ruc },
        defaults: c,
      });
      clientes.push(cliente);
    }

    console.log("🏢 Clientes OK");

    /* =========================
       CONTACTOS
    ========================= */
    const contactosData = [
      {
        nombre: "Juan Pérez",
        correo: "juan@arquitectos.com",
        telefono: "999111222",
        clienteId: clientes[0].id,
      },
      {
        nombre: "María López",
        correo: "maria@arquitectos.com",
        telefono: "999333444",
        clienteId: clientes[0].id,
      },
      {
        nombre: "Carlos Ruiz",
        correo: "carlos@andina.com",
        telefono: "988444555",
        clienteId: clientes[1].id,
      },
    ];

    for (const c of contactosData) {
      await Contacto.findOrCreate({
        where: {
          correo: c.correo,
          clienteId: c.clienteId,
        },
        defaults: c,
      });
    }

    console.log("📇 Contactos OK");

    /* =========================
       FAMILIAS
    ========================= */
    const familiasData = [
      { nombre: "Control de Acceso" },
      { nombre: "GPS" },
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
       EQUIPOS (NUEVO MODELO)
    ========================= */
   const equiposData = [
  {
    codigo: "EQ-001",
    numeroOV: "OV-1001",
    fechaOV: "2025-01-10",
    numeroOrdenCliente: "OC-9001",
    fechaOrdenCliente: "2025-01-05",

    clienteId: clientes[0].id,
    paisId: paises[0].id, // 🇵🇪 PERU

    id_cliente: "CLI-EQ-001",

    sede: "Lima",
    almacen: "Almacén Central",
    operadorLogistico: "DHL",

    status: "Almacen",

    idPlaca: "ABC-123",

    // ✅ NUEVO MODELO
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
    paisId: paises[0].id, // 🇵🇪 PERU

    id_cliente: "CLI-EQ-002",

    sede: "Arequipa",
    almacen: "Almacén Sur",
    operadorLogistico: "Shalom",

    status: "En compra",

    idPlaca: "XYZ-789",

    // ✅ NUEVO MODELO
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
       TRABAJADORES (NO TOCADO)
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
      apellido: "Torres",
      dni: "48912345",
      rol: "operario_de_mantenimiento",
      empresa: "Contratista SAC",
    },
    {
      nombre: "Jean",
      apellido: "Perez",
      dni: "48912346",
      rol: "operario_de_mantenimiento",
      empresa: "Contratista SAC",
    },
    {
      nombre: "Andres",
      apellido: "Gonzalez",
      dni: "48912347",
      rol: "operario_de_mantenimiento",
      empresa: "Contratista SAC",
    },
    {
      nombre: "Sebastian",
      apellido: "Nuñez",
      dni: "48912348",
      rol: "supervisor",
      empresa: "Contratista SAC",
    }
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
