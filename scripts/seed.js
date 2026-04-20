require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const db = require("../db_connection");

const { Cliente, Contacto, Item, SapRubro, SapPaqueteTrabajo, Rol, Permiso, Usuario } = db;

// Todos los permisos del sistema
const PERMISOS = [
  // Superadmin
  { nombre: "all_access", descripcion: "Acceso total al sistema (administrador)" },
  // Usuarios
  { nombre: "read_usuarios", descripcion: "Ver usuarios" },
  { nombre: "create_usuarios", descripcion: "Crear usuarios" },
  { nombre: "update_usuarios", descripcion: "Editar usuarios" },
  { nombre: "delete_usuarios", descripcion: "Eliminar usuarios" },
  // Roles & Permisos
  { nombre: "read_roles", descripcion: "Ver roles" },
  { nombre: "create_roles", descripcion: "Crear roles" },
  { nombre: "update_roles", descripcion: "Editar roles" },
  { nombre: "delete_roles", descripcion: "Eliminar roles" },
  { nombre: "read_permisos", descripcion: "Ver permisos" },
  { nombre: "create_permisos", descripcion: "Crear permisos" },
  { nombre: "update_permisos", descripcion: "Editar permisos" },
  { nombre: "delete_permisos", descripcion: "Eliminar permisos" },
  // Avisos
  { nombre: "read_avisos", descripcion: "Ver avisos" },
  { nombre: "create_avisos", descripcion: "Crear avisos" },
  { nombre: "update_avisos", descripcion: "Editar avisos" },
  { nombre: "delete_avisos", descripcion: "Eliminar avisos" },
  // Clientes
  { nombre: "read_clientes", descripcion: "Ver clientes" },
  { nombre: "create_clientes", descripcion: "Crear clientes" },
  { nombre: "update_clientes", descripcion: "Editar clientes" },
  { nombre: "delete_clientes", descripcion: "Eliminar clientes" },
  // Contactos
  { nombre: "read_contactos", descripcion: "Ver contactos" },
  { nombre: "create_contactos", descripcion: "Crear contactos" },
  { nombre: "update_contactos", descripcion: "Editar contactos" },
  { nombre: "delete_contactos", descripcion: "Eliminar contactos" },
  // Equipos
  { nombre: "read_equipos", descripcion: "Ver equipos" },
  { nombre: "create_equipos", descripcion: "Crear equipos" },
  { nombre: "update_equipos", descripcion: "Editar equipos" },
  { nombre: "delete_equipos", descripcion: "Eliminar equipos" },
  // Familias
  { nombre: "read_familias", descripcion: "Ver familias" },
  { nombre: "create_familias", descripcion: "Crear familias" },
  { nombre: "update_familias", descripcion: "Editar familias" },
  { nombre: "delete_familias", descripcion: "Eliminar familias" },
  // Guías de Mantenimiento
  { nombre: "read_guias", descripcion: "Ver guías de mantenimiento" },
  { nombre: "create_guias", descripcion: "Crear guías de mantenimiento" },
  { nombre: "update_guias", descripcion: "Editar guías de mantenimiento" },
  { nombre: "delete_guias", descripcion: "Eliminar guías de mantenimiento" },
  // Notificaciones
  { nombre: "read_notificaciones", descripcion: "Ver notificaciones" },
  { nombre: "create_notificaciones", descripcion: "Crear notificaciones" },
  { nombre: "update_notificaciones", descripcion: "Editar notificaciones" },
  // Órdenes de Trabajo
  { nombre: "read_ordenes_trabajo", descripcion: "Ver órdenes de trabajo" },
  { nombre: "create_ordenes_trabajo", descripcion: "Crear órdenes de trabajo" },
  { nombre: "update_ordenes_trabajo", descripcion: "Editar órdenes de trabajo" },
  { nombre: "delete_ordenes_trabajo", descripcion: "Eliminar órdenes de trabajo" },
  // Países
  { nombre: "read_paises", descripcion: "Ver países" },
  { nombre: "create_paises", descripcion: "Crear países" },
  { nombre: "update_paises", descripcion: "Editar países" },
  { nombre: "delete_paises", descripcion: "Eliminar países" },
  // Personal Correo
  { nombre: "read_personal_correo", descripcion: "Ver personal de correo" },
  { nombre: "create_personal_correo", descripcion: "Crear personal de correo" },
  { nombre: "update_personal_correo", descripcion: "Editar personal de correo" },
  { nombre: "delete_personal_correo", descripcion: "Eliminar personal de correo" },
  // Planes de Mantenimiento
  { nombre: "read_planes", descripcion: "Ver planes de mantenimiento" },
  { nombre: "create_planes", descripcion: "Crear planes de mantenimiento" },
  { nombre: "update_planes", descripcion: "Editar planes de mantenimiento" },
  { nombre: "delete_planes", descripcion: "Eliminar planes de mantenimiento" },
  // Sedes
  { nombre: "read_sedes", descripcion: "Ver sedes" },
  { nombre: "create_sedes", descripcion: "Crear sedes" },
  { nombre: "update_sedes", descripcion: "Editar sedes" },
  { nombre: "delete_sedes", descripcion: "Eliminar sedes" },
  // Solicitudes de Almacén
  { nombre: "read_solicitudes_almacen", descripcion: "Ver solicitudes de almacén" },
  { nombre: "create_solicitudes_almacen", descripcion: "Crear solicitudes de almacén" },
  { nombre: "update_solicitudes_almacen", descripcion: "Editar solicitudes de almacén" },
  // Solicitudes de Compra
  { nombre: "read_solicitudes_compra", descripcion: "Ver solicitudes de compra" },
  { nombre: "create_solicitudes_compra", descripcion: "Crear solicitudes de compra" },
  { nombre: "update_solicitudes_compra", descripcion: "Editar solicitudes de compra" },
  // Trabajadores
  { nombre: "read_trabajadores", descripcion: "Ver trabajadores" },
  { nombre: "create_trabajadores", descripcion: "Crear trabajadores" },
  { nombre: "update_trabajadores", descripcion: "Editar trabajadores" },
  { nombre: "delete_trabajadores", descripcion: "Eliminar trabajadores" },
  // Tratamientos
  { nombre: "read_tratamientos", descripcion: "Ver tratamientos" },
  { nombre: "create_tratamientos", descripcion: "Crear tratamientos" },
  { nombre: "update_tratamientos", descripcion: "Editar tratamientos" },
  // Ubicaciones Técnicas
  { nombre: "read_ubicaciones_tecnicas", descripcion: "Ver ubicaciones técnicas" },
  { nombre: "create_ubicaciones_tecnicas", descripcion: "Crear ubicaciones técnicas" },
  { nombre: "update_ubicaciones_tecnicas", descripcion: "Editar ubicaciones técnicas" },
  { nombre: "delete_ubicaciones_tecnicas", descripcion: "Eliminar ubicaciones técnicas" },
  // Configuración de vistas
  { nombre: "read_view_config", descripcion: "Ver configuración de vistas" },
  { nombre: "update_view_config", descripcion: "Editar configuración de vistas" },
  // Excel
  { nombre: "read_excel", descripcion: "Ver y exportar Excel" },
  { nombre: "update_excel", descripcion: "Configurar exportación Excel" },
];

const run = async () => {
  try {
    console.log("Iniciando seed...");

    await db.sequelize.authenticate();
    console.log("DB conectada");

    // =========================
    // PERMISOS
    // =========================
    console.log("Creando permisos...");
    const permisosCreados = await Permiso.bulkCreate(PERMISOS, {
      ignoreDuplicates: true,
    });
    console.log(`${PERMISOS.length} permisos creados`);

    // Recargar todos los permisos (por si algunos ya existían)
    const todosLosPermisos = await Permiso.findAll({ where: { state: true } });

    // =========================
    // ROL ADMIN
    // =========================
    console.log("Creando rol Administrador...");
    const [rolAdmin] = await Rol.findOrCreate({
      where: { nombre: "Administrador" },
      defaults: { nombre: "Administrador", descripcion: "Acceso total al sistema", state: true },
    });

    await rolAdmin.setPermisos(todosLosPermisos);
    console.log(`Rol Administrador creado con ${todosLosPermisos.length} permisos`);

    // =========================
    // USUARIO ADMIN
    // =========================
    console.log("Creando usuario admin...");
    const [adminExistente] = await Usuario.findOrCreate({
      where: { usuario: "admin" },
      defaults: {
        usuario: "admin",
        contraseña: "Admin123",
        correo: "admin@alsud.com",
        token: null,
        state: true,
        id_rol: rolAdmin.id,
      },
    });

    if (!adminExistente.isNewRecord) {
      await adminExistente.update({ id_rol: rolAdmin.id });
      console.log("Usuario admin ya existía — se actualizó su rol");
    } else {
      console.log("Usuario admin creado: usuario=admin / contraseña=Admin123");
    }


    // =========================
    // RUBROS
    // =========================
    const rubros = [];
    for (let i = 1; i <= 5; i++) {
      rubros.push({
        id: uuidv4(),
        codigo: `R${i}`,
        descripcion: `Rubro ${i}`,
        activo: true,
      });
    }
    await SapRubro.bulkCreate(rubros);

    // =========================
    // PAQUETES
    // =========================
    const paquetes = [];
    for (let i = 1; i <= 5; i++) {
      paquetes.push({
        id: uuidv4(),
        codigo: `P${i}`,
        descripcion: `Paquete ${i}`,
        activo: true,
      });
    }
    await SapPaqueteTrabajo.bulkCreate(paquetes);

    // =========================
    // CLIENTES
    // =========================
    const clientes = [];
    for (let i = 1; i <= 3; i++) {
      clientes.push({
        id: uuidv4(),
        sapCode: `C00${i}`,
        razonSocial: `Cliente ${i}`,
        ruc: `2010000000${i}`,
        direccion: `Direccion ${i}`,
        telefono: `99900000${i}`,
        correo: `cliente${i}@mail.com`,
        tipoCliente: "Empresa",
        activoSAP: true,
        estado: "Activo",
      });
    }

    const clientesCreados = await Cliente.bulkCreate(clientes);

    // =========================
    // CONTACTOS
    // =========================
    const contactos = [];

    clientesCreados.forEach((cliente, index) => {
      for (let j = 1; j <= 2; j++) {
        contactos.push({
          id: uuidv4(),
          clienteId: cliente.id,
          nombre: `Contacto ${j} Cliente ${index + 1}`,
          correo: `contacto${j}_c${index + 1}@mail.com`,
          telefono: `9880000${j}${index}`,
          cargo: "Administrador",
          activo: true,
        });
      }
    });

    await Contacto.bulkCreate(contactos);

    // =========================
    // ITEMS
    // =========================
    const items = [];

    for (let i = 1; i <= 20; i++) {
      const rubro = rubros[i % rubros.length];

      items.push({
        id: uuidv4(),
        sapCode: `ITEM${i}`,
        nombre: `Item ${i}`,
        rubroSapCode: null,
        rubroNombre: rubro.descripcion,
        unidadCompra: "UND",
        unidadInventario: "UND",
        unidadVenta: "UND",
        activoSAP: true,
      });
    }

    await Item.bulkCreate(items);

    console.log("✅ Seed completado correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();