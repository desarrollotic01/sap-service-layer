const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const {
  Aviso,
  AvisoEquipo,
  AvisoUbicacion,
  Usuario,
  Pais,
  Equipo,
  UbicacionTecnica,
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  OrdenTrabajoEquipoTrabajador,
  OrdenTrabajoEquipoActividad,
  PlanMantenimiento,
  PlanMantenimientoActividad,
  Familia,
  GuiaMantenimiento,
  Trabajador,
  Cliente,
  Sede,
} = require("../db_connection");

/* ============================================================
   DEFINICIÓN DE CAMPOS POR MÓDULO
============================================================ */

const FIELD_DEFINITIONS = {
  aviso: {
    sheets: [
      { key: "principal", label: "Avisos" },
      { key: "equipos", label: "Equipos y Ubicaciones" },
    ],
    fields: {
      principal: [
        { key: "numeroAviso",         label: "N° Aviso",           group: "aviso",  resolve: (r) => r.numeroAviso },
        { key: "tipoAviso",           label: "Tipo Aviso",          group: "aviso",  resolve: (r) => r.tipoAviso },
        { key: "prioridad",           label: "Prioridad",           group: "aviso",  resolve: (r) => r.prioridad },
        { key: "estadoAviso",         label: "Estado",              group: "aviso",  resolve: (r) => r.estadoAviso },
        { key: "tipoMantenimiento",   label: "Tipo Mantenimiento",  group: "aviso",  resolve: (r) => r.tipoMantenimiento },
        { key: "producto",            label: "Producto",            group: "aviso",  resolve: (r) => r.producto },
        { key: "descripcionResumida", label: "Descripción",         group: "aviso",  resolve: (r) => r.descripcionResumida },
        { key: "origenAviso",         label: "Origen",              group: "aviso",  resolve: (r) => r.origenAviso },
        { key: "ordenVenta",          label: "Orden de Venta",      group: "aviso",  resolve: (r) => r.ordenVenta },
        { key: "fechaAtencion",       label: "Fecha Atención",      group: "aviso",  resolve: (r) => r.fechaAtencion },
        { key: "createdAt",           label: "Fecha Creación",      group: "aviso",  resolve: (r) => formatDate(r.createdAt) },
        { key: "creador",             label: "Creado Por",          group: "aviso",  resolve: (r) => r.creador?.nombreApellido || "" },
        { key: "solicitante",         label: "Solicitante",         group: "aviso",  resolve: (r) => r.solicitante?.nombreApellido || "" },
        { key: "supervisor",          label: "Supervisor",          group: "aviso",  resolve: (r) => r.supervisor ? `${r.supervisor.nombre} ${r.supervisor.apellido}`.trim() : "" },
        { key: "cliente",             label: "Cliente",             group: "aviso",  resolve: (r) => r.clienteData?.razonSocial || "" },
        { key: "pais",                label: "País",                group: "aviso",  resolve: (r) => r.pais?.nombre || "" },
        { key: "nombreContacto",      label: "Contacto",            group: "aviso",  resolve: (r) => r.nombreContacto },
        { key: "direccionAtencion",   label: "Dirección Atención",  group: "aviso",  resolve: (r) => r.direccionAtencion },
      ],
      equipos: [
        { key: "av_numeroAviso",  label: "N° Aviso",    group: "aviso",  resolve: (r) => r._av_numeroAviso },
        { key: "av_estadoAviso",  label: "Estado",      group: "aviso",  resolve: (r) => r._av_estadoAviso },
        { key: "av_ordenVenta",   label: "OV",          group: "aviso",  resolve: (r) => r._av_ordenVenta },
        { key: "eq_tipo",         label: "Tipo",        group: "equipo", resolve: (r) => r._eq_tipo },
        { key: "eq_codigo",       label: "Código",      group: "equipo", resolve: (r) => r._eq_codigo },
        { key: "eq_nombre",       label: "Nombre",      group: "equipo", resolve: (r) => r._eq_nombre },
      ],
    },
  },

  ordenTrabajo: {
    sheets: [
      { key: "plano", label: "Reporte OT-Equipos" },
      { key: "actividades", label: "Actividades" },
      { key: "trabajadores", label: "Trabajadores" },
    ],
    fields: {
      /* ── Sheet "plano": una fila por OT × equipo/ubicación ── */
      plano: [
        /* ── Grupo Aviso ──────────────────────────────────── */
        { key: "av_numeroAviso",         label: "N° Aviso",            group: "aviso",  resolve: (r) => r._av_numeroAviso },
        { key: "av_tipoAviso",           label: "Tipo Aviso",          group: "aviso",  resolve: (r) => r._av_tipoAviso },
        { key: "av_prioridad",           label: "Prioridad Aviso",     group: "aviso",  resolve: (r) => r._av_prioridad },
        { key: "av_estadoAviso",         label: "Estado Aviso",        group: "aviso",  resolve: (r) => r._av_estadoAviso },
        { key: "av_tipoMantenimiento",   label: "Tipo Mant. Aviso",    group: "aviso",  resolve: (r) => r._av_tipoMantenimiento },
        { key: "av_ordenVenta",          label: "OV Aviso",            group: "aviso",  resolve: (r) => r._av_ordenVenta },
        { key: "av_fechaAtencion",       label: "Fecha Atención",      group: "aviso",  resolve: (r) => r._av_fechaAtencion },
        /* ── Grupo OT ─────────────────────────────────────── */
        { key: "ot_numeroOT",            label: "N° OT",              group: "ot",     resolve: (r) => r._ot_numeroOT },
        { key: "ot_estado",              label: "Estado OT",           group: "ot",     resolve: (r) => r._ot_estado },
        { key: "ot_tipoMantenimiento",   label: "Tipo Mantenimiento",  group: "ot",     resolve: (r) => r._ot_tipoMantenimiento },
        { key: "ot_supervisor",          label: "Supervisor",          group: "ot",     resolve: (r) => r._ot_supervisor },
        { key: "ot_fechaProgramadaInicio", label: "Inicio Prog. OT",   group: "ot",     resolve: (r) => r._ot_fechaProgramadaInicio },
        { key: "ot_fechaProgramadaFin",  label: "Fin Prog. OT",        group: "ot",     resolve: (r) => r._ot_fechaProgramadaFin },
        { key: "ot_observaciones",       label: "Observaciones",       group: "ot",     resolve: (r) => r._ot_observaciones },
        { key: "ot_descripcionGeneral",  label: "Desc. General",       group: "ot",     resolve: (r) => r._ot_descripcionGeneral },
        { key: "ot_descripcionDetallada",label: "Desc. Detallada",     group: "ot",     resolve: (r) => r._ot_descripcionDetallada },
        /* ── Grupo Equipo/Ubicación ────────────────────────── */
        { key: "eq_tipo",                label: "Tipo",                group: "equipo", resolve: (r) => r._eq_tipo },
        { key: "eq_nombre",              label: "Nombre",              group: "equipo", resolve: (r) => r._eq_nombre },
        { key: "eq_codigo",              label: "Código",              group: "equipo", resolve: (r) => r._eq_codigo },
        { key: "eq_descripcionEquipo",   label: "Desc. Equipo",        group: "equipo", resolve: (r) => r._eq_descripcionEquipo },
        { key: "eq_prioridad",           label: "Prioridad",           group: "equipo", resolve: (r) => r._eq_prioridad },
        { key: "eq_fechaInicioProgramada", label: "Inicio Prog. Equipo", group: "equipo", resolve: (r) => r._eq_fechaInicioProgramada },
        { key: "eq_fechaFinProgramada",  label: "Fin Prog. Equipo",    group: "equipo", resolve: (r) => r._eq_fechaFinProgramada },
      ],
      actividades: [
        { key: "numeroOT", label: "N° OT", resolve: (r) => r._ot },
        { key: "equipoNombre", label: "Equipo/Ubicación", resolve: (r) => r._equipoNombre },
        { key: "tarea", label: "Tarea", resolve: (r) => r.tarea },
        { key: "sistema", label: "Sistema", resolve: (r) => r.sistema },
        { key: "subsistema", label: "Subsistema", resolve: (r) => r.subsistema },
        { key: "componente", label: "Componente", resolve: (r) => r.componente },
        { key: "tipoTrabajo", label: "Tipo de Trabajo", resolve: (r) => r.tipoTrabajo },
        { key: "estado", label: "Estado", resolve: (r) => r.estado },
        { key: "origen", label: "Origen", resolve: (r) => r.origen },
        { key: "rolTecnico", label: "Rol Técnico", resolve: (r) => r.rolTecnico },
        { key: "cantidadTecnicos", label: "Cant. Técnicos", resolve: (r) => r.cantidadTecnicos },
        {
          key: "duracionEstimada",
          label: "Duración Estimada",
          resolve: (r) =>
            r.duracionEstimadaValor ? `${r.duracionEstimadaValor} ${r.unidadDuracion}` : "",
        },
        {
          key: "duracionReal",
          label: "Duración Real",
          resolve: (r) =>
            r.duracionRealValor ? `${r.duracionRealValor} ${r.unidadDuracionReal}` : "",
        },
        { key: "descripcion", label: "Descripción", resolve: (r) => r.descripcion },
        { key: "observaciones", label: "Observaciones", resolve: (r) => r.observaciones },
      ],
      trabajadores: [
        { key: "numeroOT", label: "N° OT", resolve: (r) => r._ot },
        { key: "equipoNombre", label: "Equipo/Ubicación", resolve: (r) => r._equipoNombre },
        { key: "nombre", label: "Nombre", resolve: (r) => r.trabajador?.nombre || "" },
        { key: "apellido", label: "Apellido", resolve: (r) => r.trabajador?.apellido || "" },
        { key: "rol", label: "Rol", resolve: (r) => r.trabajador?.rol || "" },
        { key: "esEncargado", label: "Es Encargado", resolve: (r) => (r.esEncargado ? "Sí" : "No") },
      ],
    },
  },

  equipo: {
    sheets: [{ key: "principal", label: "Equipos" }],
    fields: {
      principal: [
        { key: "nombre", label: "Nombre", resolve: (r) => r.nombre },
        { key: "descripcion", label: "Descripción", resolve: (r) => r.descripcion },
        { key: "marca", label: "Marca", resolve: (r) => r.marca },
        { key: "modelo", label: "Modelo", resolve: (r) => r.modelo },
        { key: "serie", label: "N° Serie", resolve: (r) => r.serie },
        { key: "estado", label: "Estado", resolve: (r) => r.estado },
        { key: "creticidad", label: "Criticidad", resolve: (r) => r.creticidad },
        { key: "tipoEquipoPropiedad", label: "Tipo Propiedad", resolve: (r) => r.tipoEquipoPropiedad },
        { key: "finGarantia", label: "Fin Garantía", resolve: (r) => r.finGarantia },
        { key: "linea", label: "Línea", resolve: (r) => r.linea },
        { key: "numeroOV", label: "N° OV", resolve: (r) => r.numeroOV },
        { key: "tipoEquipo", label: "Tipo Equipo", resolve: (r) => r.tipoEquipo },
        { key: "cliente", label: "Cliente", resolve: (r) => r.cliente?.razonSocial || "" },
        { key: "sede", label: "Sede", resolve: (r) => r.sedeRelacion?.nombre || r.sede || "" },
        { key: "familia", label: "Familia", resolve: (r) => r.familia?.nombre || "" },
        { key: "createdAt", label: "Fecha Alta", resolve: (r) => formatDate(r.createdAt) },
      ],
    },
  },

  ubicacionTecnica: {
    sheets: [{ key: "principal", label: "Ubicaciones Técnicas" }],
    fields: {
      principal: [
        { key: "codigo", label: "Código", resolve: (r) => r.codigo },
        { key: "nombre", label: "Nombre", resolve: (r) => r.nombre },
        { key: "especialidad", label: "Especialidad", resolve: (r) => r.especialidad },
        { key: "tipoEquipoPropiedad", label: "Tipo Propiedad", resolve: (r) => r.tipoEquipoPropiedad },
        { key: "finGarantia", label: "Fin Garantía", resolve: (r) => r.finGarantia },
        { key: "numeroOV", label: "N° OV", resolve: (r) => r.numeroOV },
        { key: "cliente", label: "Cliente", resolve: (r) => r.cliente?.razonSocial || "" },
        { key: "sede", label: "Sede", resolve: (r) => r.sedeRelacion?.nombre || "" },
        { key: "createdAt", label: "Fecha Alta", resolve: (r) => formatDate(r.createdAt) },
      ],
    },
  },

  guiaMantenimiento: {
    sheets: [{ key: "principal", label: "Guías de Mantenimiento" }],
    fields: {
      principal: [
        { key: "numeroAlerta", label: "N° Alerta", resolve: (r) => r.numeroAlerta },
        { key: "tipoMantenimiento", label: "Tipo Mantenimiento", resolve: (r) => r.tipoMantenimiento },
        { key: "periodo", label: "Período", resolve: (r) => r.periodo },
        { key: "estadoGuia", label: "Estado", resolve: (r) => r.estadoGuia },
        { key: "periodoActivo", label: "Activo", resolve: (r) => (r.periodoActivo ? "Sí" : "No") },
        { key: "ordenVenta", label: "Orden de Venta", resolve: (r) => r.ordenVenta },
        { key: "fechaInicioAlerta", label: "Fecha Inicio", resolve: (r) => r.fechaInicioAlerta },
        { key: "planMantenimiento", label: "Plan de Mantenimiento", resolve: (r) => r.planMantenimiento?.nombre || "" },
        { key: "equipo", label: "Equipo", resolve: (r) => r.equipo?.nombre || "" },
        { key: "ubicacionTecnica", label: "Ubicación Técnica", resolve: (r) => r.ubicacionTecnica?.nombre || "" },
        { key: "solicitante", label: "Solicitante", resolve: (r) => r.solicitante?.nombreApellido || "" },
        { key: "createdAt", label: "Fecha Creación", resolve: (r) => formatDate(r.createdAt) },
      ],
    },
  },

  planMantenimiento: {
    sheets: [
      { key: "principal", label: "Planes de Mantenimiento" },
      { key: "actividades", label: "Actividades" },
    ],
    fields: {
      principal: [
        { key: "codigoPlan", label: "Código Plan", resolve: (r) => r.codigoPlan },
        { key: "nombre", label: "Nombre", resolve: (r) => r.nombre },
        { key: "tipo", label: "Tipo", resolve: (r) => r.tipo },
        { key: "frecuencia", label: "Frecuencia", resolve: (r) => r.frecuencia },
        { key: "contextoObjetivo", label: "Contexto Objetivo", resolve: (r) => r.contextoObjetivo },
        { key: "esEspecifico", label: "Es Específico", resolve: (r) => (r.esEspecifico ? "Sí" : "No") },
        { key: "activo", label: "Activo", resolve: (r) => (r.activo ? "Sí" : "No") },
        { key: "tipoEquipo", label: "Tipo Equipo", resolve: (r) => r.tipoEquipo },
        { key: "modeloEquipo", label: "Modelo Equipo", resolve: (r) => r.modeloEquipo },
        { key: "familia", label: "Familia", resolve: (r) => r.familia?.nombre || "" },
        { key: "cantActividades", label: "Cant. Actividades", resolve: (r) => r.actividades?.length || 0 },
        { key: "createdAt", label: "Fecha Creación", resolve: (r) => formatDate(r.createdAt) },
      ],
      actividades: [
        { key: "codigoPlan", label: "Código Plan", resolve: (r) => r._codigoPlan },
        { key: "planNombre", label: "Nombre Plan", resolve: (r) => r._planNombre },
        { key: "codigoActividad", label: "Código Actividad", resolve: (r) => r.codigoActividad },
        { key: "sistema", label: "Sistema", resolve: (r) => r.sistema },
        { key: "subsistema", label: "Subsistema", resolve: (r) => r.subsistema },
        { key: "componente", label: "Componente", resolve: (r) => r.componente },
        { key: "tarea", label: "Tarea", resolve: (r) => r.tarea },
        { key: "tipoTrabajo", label: "Tipo de Trabajo", resolve: (r) => r.tipoTrabajo },
        { key: "rolTecnico", label: "Rol Técnico", resolve: (r) => r.rolTecnico },
        { key: "cantidadTecnicos", label: "Cant. Técnicos", resolve: (r) => r.cantidadTecnicos },
        {
          key: "duracion",
          label: "Duración Estimada",
          resolve: (r) => (r.duracionMinutos ? `${r.duracionMinutos} min` : ""),
        },
        { key: "orden", label: "Orden", resolve: (r) => r.orden },
      ],
    },
  },
};

/* ============================================================
   HELPERS
============================================================ */

const formatDate = (val) => {
  if (!val) return "";
  return new Date(val).toLocaleDateString("es-AR");
};

const MODULOS_VALIDOS = Object.keys(FIELD_DEFINITIONS);

/* ============================================================
   INCLUDES POR MÓDULO
============================================================ */

const buildInclude = (modulo) => {
  switch (modulo) {
    case "aviso":
      return [
        { model: Usuario, as: "creador", attributes: ["id", "nombreApellido"], required: false },
        { model: Usuario, as: "solicitante", attributes: ["id", "nombreApellido"], required: false },
        { model: Trabajador, as: "supervisor", attributes: ["id", "nombre", "apellido"], required: false },
        { model: Cliente, as: "clienteData", attributes: ["id", "razonSocial"], required: false },
        { model: Pais, as: "pais", attributes: ["id", "nombre"], required: false },
        {
          model: AvisoEquipo,
          as: "equiposRelacion",
          required: false,
          include: [{ model: Equipo, as: "equipo", attributes: ["id", "nombre", "codigo"], required: false }],
        },
        {
          model: AvisoUbicacion,
          as: "ubicacionesRelacion",
          required: false,
          include: [{ model: UbicacionTecnica, as: "ubicacion", attributes: ["id", "nombre", "codigo"], required: false }],
        },
      ];

    case "ordenTrabajo":
      return [
        {
          model: Aviso,
          as: "aviso",
          attributes: ["id", "numeroAviso", "tipoAviso", "prioridad", "estadoAviso", "tipoMantenimiento", "ordenVenta", "fechaAtencion"],
          required: false,
        },
        { model: Trabajador, as: "supervisor", attributes: ["id", "nombre", "apellido"], required: false },
        {
          model: OrdenTrabajoEquipo,
          as: "equipos",
          required: false,
          include: [
            { model: Equipo, as: "equipo", attributes: ["id", "nombre", "codigo"], required: false },
            {
              model: UbicacionTecnica,
              as: "ubicacionTecnica",
              attributes: ["id", "nombre", "codigo"],
              required: false,
            },
            {
              model: OrdenTrabajoEquipoTrabajador,
              as: "trabajadores",
              required: false,
              include: [
                {
                  model: Trabajador,
                  as: "trabajador",
                  attributes: ["id", "nombre", "apellido", "rol"],
                  required: false,
                },
              ],
            },
            { model: OrdenTrabajoEquipoActividad, as: "actividades", required: false },
          ],
        },
      ];

    case "equipo":
      return [
        { model: Cliente, as: "cliente", attributes: ["id", "razonSocial"], required: false },
        { model: Sede, as: "sedeRelacion", attributes: ["id", "nombre"], required: false },
        { model: Familia, as: "familia", attributes: ["id", "nombre"], required: false },
      ];

    case "ubicacionTecnica":
      return [
        { model: Cliente, as: "cliente", attributes: ["id", "razonSocial"], required: false },
        { model: Sede, as: "sedeRelacion", attributes: ["id", "nombre"], required: false },
      ];

    case "guiaMantenimiento":
      return [
        {
          model: PlanMantenimiento,
          as: "planMantenimiento",
          attributes: ["id", "nombre", "codigoPlan"],
          required: false,
        },
        { model: Equipo, as: "equipo", attributes: ["id", "nombre"], required: false },
        {
          model: UbicacionTecnica,
          as: "ubicacionTecnica",
          attributes: ["id", "nombre", "codigo"],
          required: false,
        },
        { model: Usuario, as: "solicitante", attributes: ["id", "nombreApellido"], required: false },
      ];

    case "planMantenimiento":
      return [
        { model: Familia, as: "familia", attributes: ["id", "nombre"], required: false },
        { model: PlanMantenimientoActividad, as: "actividades", required: false },
      ];

    default:
      return [];
  }
};

/* ============================================================
   WHERE POR MÓDULO
============================================================ */

const buildWhere = (modulo, filters = {}) => {
  const where = {};

  switch (modulo) {
    case "aviso":
      if (filters.estadoAviso) where.estadoAviso = filters.estadoAviso;
      if (filters.tipoAviso) where.tipoAviso = filters.tipoAviso;
      if (filters.prioridad) where.prioridad = filters.prioridad;
      if (filters.tipoMantenimiento) where.tipoMantenimiento = filters.tipoMantenimiento;
      if (filters.producto) where.producto = filters.producto;
      if (filters.origenAviso) where.origenAviso = filters.origenAviso;
      if (filters.clienteId) where.clienteId = filters.clienteId;
      if (filters.solicitanteId) where.solicitanteId = filters.solicitanteId;
      if (filters.supervisorId) where.supervisorId = filters.supervisorId;
      if (filters.paisId) where.paisId = filters.paisId;
      if (filters.fechaDesde && filters.fechaHasta) {
        where.fechaAtencion = { [Op.between]: [filters.fechaDesde, filters.fechaHasta] };
      } else if (filters.fechaDesde) {
        where.fechaAtencion = { [Op.gte]: filters.fechaDesde };
      } else if (filters.fechaHasta) {
        where.fechaAtencion = { [Op.lte]: filters.fechaHasta };
      }
      break;

    case "ordenTrabajo":
      if (filters.estado) where.estado = filters.estado;
      if (filters.tipoMantenimiento) where.tipoMantenimiento = filters.tipoMantenimiento;
      if (filters.fechaDesde && filters.fechaHasta) {
        where.fechaProgramadaInicio = { [Op.between]: [filters.fechaDesde, filters.fechaHasta] };
      } else if (filters.fechaDesde) {
        where.fechaProgramadaInicio = { [Op.gte]: filters.fechaDesde };
      } else if (filters.fechaHasta) {
        where.fechaProgramadaInicio = { [Op.lte]: filters.fechaHasta };
      }
      break;

    case "equipo":
      if (filters.clienteId) where.clienteId = filters.clienteId;
      if (filters.sedeId) where.sedeId = filters.sedeId;
      if (filters.familiaId) where.familiaId = filters.familiaId;
      if (filters.creticidad) where.creticidad = filters.creticidad;
      if (filters.tipoEquipoPropiedad) where.tipoEquipoPropiedad = filters.tipoEquipoPropiedad;
      if (filters.estado) where.estado = filters.estado;
      if (filters.linea) where.linea = filters.linea;
      break;

    case "ubicacionTecnica":
      if (filters.clienteId) where.clienteId = filters.clienteId;
      if (filters.sedeId) where.sedeId = filters.sedeId;
      if (filters.especialidad) where.especialidad = filters.especialidad;
      if (filters.tipoEquipoPropiedad) where.tipoEquipoPropiedad = filters.tipoEquipoPropiedad;
      break;

    case "guiaMantenimiento":
      if (filters.periodo) where.periodo = filters.periodo;
      if (filters.estadoGuia) where.estadoGuia = filters.estadoGuia;
      if (filters.planMantenimientoId) where.planMantenimientoId = filters.planMantenimientoId;
      if (filters.equipoId) where.equipoId = filters.equipoId;
      if (filters.ubicacionTecnicaId) where.ubicacionTecnicaId = filters.ubicacionTecnicaId;
      if (filters.periodoActivo !== undefined && filters.periodoActivo !== "") {
        where.periodoActivo = filters.periodoActivo === "true" || filters.periodoActivo === true;
      }
      break;

    case "planMantenimiento":
      if (filters.tipo) where.tipo = filters.tipo;
      if (filters.frecuencia) where.frecuencia = filters.frecuencia;
      if (filters.familiaId) where.familiaId = filters.familiaId;
      if (filters.contextoObjetivo) where.contextoObjetivo = filters.contextoObjetivo;
      if (filters.activo !== undefined && filters.activo !== "") {
        where.activo = filters.activo === "true" || filters.activo === true;
      }
      break;
  }

  return where;
};

/* ============================================================
   MODELO SEQUELIZE POR MÓDULO
============================================================ */

const getModel = (modulo) => {
  switch (modulo) {
    case "aviso":          return Aviso;
    case "ordenTrabajo":   return OrdenTrabajo;
    case "equipo":         return Equipo;
    case "ubicacionTecnica": return UbicacionTecnica;
    case "guiaMantenimiento": return GuiaMantenimiento;
    case "planMantenimiento": return PlanMantenimiento;
    default: throw new Error(`Módulo '${modulo}' no válido`);
  }
};

/* ============================================================
   APLANAR FILAS POR HOJA
============================================================ */

const getFlatRows = (modulo, sheetKey, records, filters = {}) => {
  const plain = records.map((r) => (r.toJSON ? r.toJSON() : r));

  if (modulo === "ordenTrabajo" && sheetKey === "plano") {
    const rows = [];

    // Filtro por equipos: lista de códigos separados por coma
    const equipoCodigos = filters.equipoCodigos
      ? filters.equipoCodigos.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

    plain.forEach((ot) => {
      const supervisorNombre = ot.supervisor
        ? `${ot.supervisor.nombre || ""} ${ot.supervisor.apellido || ""}`.trim()
        : "";
      (ot.equipos || []).forEach((eq) => {
        const isUb = !!eq.ubicacionTecnica && !eq.equipo;
        const codigo = isUb ? (eq.ubicacionTecnica?.codigo || "") : (eq.equipo?.codigo || "");

        // Aplicar filtro por equipo si hay códigos seleccionados
        if (equipoCodigos && equipoCodigos.length > 0 && !equipoCodigos.includes(codigo)) {
          return;
        }

        rows.push({
          // Aviso
          _av_numeroAviso:           ot.aviso?.numeroAviso || "",
          _av_tipoAviso:             ot.aviso?.tipoAviso || "",
          _av_prioridad:             ot.aviso?.prioridad || "",
          _av_estadoAviso:           ot.aviso?.estadoAviso || "",
          _av_tipoMantenimiento:     ot.aviso?.tipoMantenimiento || "",
          _av_ordenVenta:            ot.aviso?.ordenVenta || "",
          _av_fechaAtencion:         ot.aviso?.fechaAtencion || "",
          // OT
          _ot_numeroOT:              ot.numeroOT,
          _ot_estado:                ot.estado,
          _ot_tipoMantenimiento:     ot.tipoMantenimiento,
          _ot_supervisor:            supervisorNombre,
          _ot_fechaProgramadaInicio: formatDate(ot.fechaProgramadaInicio),
          _ot_fechaProgramadaFin:    formatDate(ot.fechaProgramadaFin),
          _ot_observaciones:         ot.observaciones,
          _ot_descripcionGeneral:    ot.descripcionGeneral,
          _ot_descripcionDetallada:  ot.descripcionDetallada,
          // Equipo/Ubicación
          _eq_tipo:                  isUb ? "Ubicación Técnica" : "Equipo",
          _eq_nombre:                isUb ? (eq.ubicacionTecnica?.nombre || "") : (eq.equipo?.nombre || ""),
          _eq_codigo:                codigo,
          _eq_descripcionEquipo:     eq.descripcionEquipo || "",
          _eq_prioridad:             eq.prioridad || "",
          _eq_fechaInicioProgramada: formatDate(eq.fechaInicioProgramada),
          _eq_fechaFinProgramada:    formatDate(eq.fechaFinProgramada),
        });
      });
    });
    return rows;
  }

  if (modulo === "ordenTrabajo" && sheetKey === "actividades") {
    const rows = [];
    plain.forEach((ot) => {
      (ot.equipos || []).forEach((eq) => {
        const equipoNombre = eq.equipo?.nombre || eq.ubicacionTecnica?.nombre || "";
        (eq.actividades || []).forEach((act) => {
          rows.push({ ...act, _ot: ot.numeroOT, _equipoNombre: equipoNombre });
        });
      });
    });
    return rows;
  }

  if (modulo === "ordenTrabajo" && sheetKey === "trabajadores") {
    const rows = [];
    plain.forEach((ot) => {
      (ot.equipos || []).forEach((eq) => {
        const equipoNombre = eq.equipo?.nombre || eq.ubicacionTecnica?.nombre || "";
        (eq.trabajadores || []).forEach((trab) => {
          rows.push({ ...trab, _ot: ot.numeroOT, _equipoNombre: equipoNombre });
        });
      });
    });
    return rows;
  }

  if (modulo === "aviso" && sheetKey === "equipos") {
    const rows = [];
    plain.forEach((av) => {
      const equipos = (av.equiposRelacion || []).map((ae) => ({
        _av_numeroAviso: av.numeroAviso,
        _av_estadoAviso: av.estadoAviso,
        _av_ordenVenta:  av.ordenVenta || "",
        _eq_tipo:        "Equipo",
        _eq_codigo:      ae.equipo?.codigo || "",
        _eq_nombre:      ae.equipo?.nombre || "",
      }));
      const ubicaciones = (av.ubicacionesRelacion || []).map((au) => ({
        _av_numeroAviso: av.numeroAviso,
        _av_estadoAviso: av.estadoAviso,
        _av_ordenVenta:  av.ordenVenta || "",
        _eq_tipo:        "Ubicación Técnica",
        _eq_codigo:      au.ubicacion?.codigo || "",
        _eq_nombre:      au.ubicacion?.nombre || "",
      }));
      const all = [...equipos, ...ubicaciones];
      if (all.length === 0) {
        rows.push({
          _av_numeroAviso: av.numeroAviso,
          _av_estadoAviso: av.estadoAviso,
          _av_ordenVenta:  av.ordenVenta || "",
          _eq_tipo: "", _eq_codigo: "", _eq_nombre: "",
        });
      } else {
        rows.push(...all);
      }
    });
    return rows;
  }

  if (modulo === "planMantenimiento" && sheetKey === "actividades") {
    const rows = [];
    plain.forEach((plan) => {
      (plan.actividades || []).forEach((act) => {
        rows.push({ ...act, _codigoPlan: plan.codigoPlan, _planNombre: plan.nombre });
      });
    });
    return rows;
  }

  return plain;
};

/* ============================================================
   ESTILO DE CABECERA
============================================================ */

const styleHeader = (row) => {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F497D" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
    };
  });
};

/* ============================================================
   GENERACIÓN DE EXCEL
============================================================ */

const generateExcel = async (modulo, campos, filters = {}) => {
  const def = FIELD_DEFINITIONS[modulo];
  if (!def) throw new Error(`Módulo '${modulo}' no válido`);

  const Model = getModel(modulo);
  const where = buildWhere(modulo, filters);
  const include = buildInclude(modulo);

  const records = await Model.findAll({ where, include, order: [["createdAt", "DESC"]] });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SAP Service Layer";
  workbook.created = new Date();

  let sheetCount = 0;

  for (const sheetDef of def.sheets) {
    const sheetKey = sheetDef.key;
    const selectedKeys = campos[sheetKey];

    if (!selectedKeys || !selectedKeys.length) continue;

    const availableFields = def.fields[sheetKey];
    const activeFields = availableFields.filter((f) => selectedKeys.includes(f.key));

    if (!activeFields.length) continue;

    const rows = getFlatRows(modulo, sheetKey, records, filters);

    const sheet = workbook.addWorksheet(sheetDef.label);
    sheetCount++;

    // Cabecera
    sheet.addRow(activeFields.map((f) => f.label));
    styleHeader(sheet.getRow(1));
    sheet.getRow(1).height = 20;

    // Datos
    rows.forEach((row) => {
      sheet.addRow(activeFields.map((f) => f.resolve(row)));
    });

    // Anchos automáticos
    sheet.columns.forEach((col, i) => {
      let maxLen = activeFields[i]?.label?.length || 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value != null ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 60);
    });

    // Filtro automático en cabecera
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: activeFields.length },
    };
  }

  if (sheetCount === 0) {
    throw new Error("No hay hojas con campos seleccionados para exportar");
  }

  return workbook;
};

module.exports = {
  FIELD_DEFINITIONS,
  MODULOS_VALIDOS,
  generateExcel,
};
