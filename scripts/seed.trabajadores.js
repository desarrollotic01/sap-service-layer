/**
 * Script de carga inicial
 * Ejecutar: node scripts/seed.base.js
 */

require("dotenv").config();

const { Sequelize } = require("sequelize");

const {
  Cliente,
  Contacto,
  UbicacionTecnica,
  Equipo,
  Trabajador,
} = require("../db_connection");

/* =========================
   CONEXIÓN
========================= */
const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  String(process.env.DB_PASSWORD),
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

/* =========================
   SEED
========================= */
async function seedBase() {
  try {
    console.log("🔌 Conectando a la base de datos...");
    await sequelize.authenticate();
    console.log("✅ Conectado");

    /* =========================
       USUARIO
    ========================= *


    console.log("👤 Usuario OK");

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
       UBICACIONES TÉCNICAS
    ========================= */
    const ubicacionesData = [
      {
        codigo: "PL-LIM",
        nombre: "Planta Lima",
        descripcion: "Planta principal",
        nivel: "Planta",
      },
      {
        codigo: "PL-LIM-P1",
        nombre: "Piso 1",
        descripcion: "Área administrativa",
        nivel: "Piso",
      },
    ];

    const ubicaciones = [];

    for (const u of ubicacionesData) {
      const [ubicacion] = await UbicacionTecnica.findOrCreate({
        where: { codigo: u.codigo },
        defaults: u,
      });
      ubicaciones.push(ubicacion);
    }

    console.log("📍 Ubicaciones técnicas OK");

    /* =========================
       EQUIPOS
    ========================= */
    const equiposData = [
      {
        codigo: "EQ-001",
        nombre: "Compresor",
        tipo: "Mecánico",
        marca: "Atlas Copco",
        ubicacionTecnica: ubicaciones[0].codigo,
      },
      {
        codigo: "EQ-002",
        nombre: "Tablero Eléctrico",
        tipo: "Eléctrico",
        marca: "Siemens",
        ubicacionTecnica: ubicaciones[1].codigo,
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
       TRABAJADORES (OPCIONAL)
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
