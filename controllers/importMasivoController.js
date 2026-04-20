const ExcelJS = require("exceljs");
const {
  Trabajador,
  Equipo,
  UbicacionTecnica,
  Cliente,
  Pais,
  Familia,
  sequelize,
} = require("../db_connection");
const { Op } = require("sequelize");

/* ═══════════════════════════════════════════════
   CONSTANTES — valores válidos para ENUMs
═══════════════════════════════════════════════ */
const ROLES_VALIDOS = [
  "tecnico_electrico",
  "tecnico_mecanico",
  "operario_de_mantenimiento",
  "supervisor",
];
const TIPO_EQUIPO_PROPIEDAD = ["Vendido", "Propio", "Atendido"];
const STATUS_EQUIPO = ["Almacen", "En compra", "Entregado"];
const ESTADO_EQUIPO = ["Operativo", "Inoperativo", "No instalado"];
const LINEA_EQUIPO = ["Acceso", "Autosat", "Vehiculos", "Otros"];
const CRETICIDAD = ["A", "B", "C"];

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const cellStr = (cell) => {
  if (cell === null || cell === undefined) return "";
  // Fórmula: ExcelJS devuelve { formula, result }
  if (typeof cell === "object" && cell !== null && "result" in cell)
    return String(cell.result ?? "").trim();
  // Texto enriquecido: { richText: [{text: "..."}, ...] }
  if (typeof cell === "object" && cell !== null && Array.isArray(cell.richText))
    return cell.richText.map((r) => r.text ?? "").join("").trim();
  // Hipervínculo: { text: "...", hyperlink: "..." }
  if (typeof cell === "object" && cell !== null && "text" in cell)
    return String(cell.text ?? "").trim();
  return String(cell).trim();
};

const cellDate = (cell) => {
  if (!cell) return null;
  if (cell instanceof Date) return isNaN(cell.getTime()) ? null : cell;
  const d = new Date(cell);
  return isNaN(d.getTime()) ? null : d;
};

const cellBool = (cell) => {
  if (cell === null || cell === undefined || cell === "") return true;
  if (typeof cell === "boolean") return cell;
  return String(cell).toLowerCase() !== "false" && String(cell) !== "0";
};

// Lee todas las filas de la primera hoja y las convierte en objetos usando la cabecera
const parseSheet = (worksheet) => {
  const rows = [];
  const headers = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Normalizar: quitar " *" del final (indicador de campo obligatorio en la plantilla)
        headers[colNumber] = cellStr(cell.value).replace(/\s*\*\s*$/, "").trim();
      });
      return;
    }
    // Siempre saltar fila 2 — es la fila de ejemplo de la plantilla
    if (rowNumber === 2) return;
    const obj = { __fila: rowNumber };
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (key) obj[key] = cell.value;
    });
    // Saltar filas completamente vacías
    const values = Object.values(obj).filter((v, i) => v !== undefined && v !== "" && v !== null);
    if (values.length <= 1) return; // solo __fila
    rows.push(obj);
  });

  return rows;
};

/* ═══════════════════════════════════════════════
   CACHE DE FK — carga una sola vez por solicitud
═══════════════════════════════════════════════ */
const cargarPaises = async () => {
  const lista = await Pais.findAll({ where: { activo: true }, attributes: ["id", "codigo", "nombre"] });
  return lista;
};

const cargarClientes = async () => {
  const lista = await Cliente.findAll({ attributes: ["id", "razonSocial", "sapCode"] });
  return lista;
};

const cargarFamilias = async () => {
  const lista = await Familia.findAll({ attributes: ["id", "nombre"] });
  return lista;
};

// Normaliza texto: minúsculas + sin acentos (Peru == Perú, PERU == Perú)
const norm = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const resolverPais = (paises, valor) => {
  if (!valor) return null;
  const v = norm(valor);
  return paises.find(
    (p) => norm(p.nombre) === v || norm(p.codigo) === v
  ) || null;
};

const resolverCliente = (clientes, valor) => {
  if (!valor) return null;
  const v = norm(valor);
  return clientes.find(
    (c) => norm(c.razonSocial) === v || norm(c.sapCode) === v
  ) || null;
};

const resolverFamilia = (familias, valor) => {
  if (!valor) return null;
  const v = norm(valor);
  return familias.find((f) => norm(f.nombre) === v) || null;
};

/* ═══════════════════════════════════════════════
   IMPORT TRABAJADORES
═══════════════════════════════════════════════ */
const importarTrabajadores = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.getWorksheet("Trabajadores")
    || workbook.worksheets.find(s => s.name !== "Valores válidos")
    || workbook.worksheets[0];
  if (!ws) throw new Error("El archivo no contiene hojas.");

  const filas = parseSheet(ws);
  const exitosos = [];
  const errores = [];

  for (const fila of filas) {
    const errs = [];
    const f = (k) => cellStr(fila[k]);

    const nombre = f("nombre");
    const apellido = f("apellido");
    const dni = f("dni");
    const rol = f("rol");
    const empresa = f("empresa") || "Interno";
    const zona = f("zona") || null;
    const direccion = f("direccion") || null;
    const fechaNacimiento = cellDate(fila["fechaNacimiento"]);
    const activo = cellBool(fila["activo"]);

    if (!nombre) errs.push("nombre es obligatorio");
    if (!apellido) errs.push("apellido es obligatorio");
    if (!dni) errs.push("dni es obligatorio");
    else if (dni.length < 7 || dni.length > 12) errs.push("dni debe tener entre 7 y 12 caracteres");
    if (!rol) errs.push("rol es obligatorio");
    else if (!ROLES_VALIDOS.includes(rol))
      errs.push(`rol inválido: "${rol}". Valores válidos: ${ROLES_VALIDOS.join(", ")}`);

    if (errs.length) {
      errores.push({ fila: fila.__fila, errores: errs });
      continue;
    }

    try {
      const existente = await Trabajador.findOne({ where: { dni } });
      if (existente) {
        errores.push({ fila: fila.__fila, errores: [`El DNI "${dni}" ya está registrado`] });
        continue;
      }
      const nuevo = await Trabajador.create({ nombre, apellido, dni, rol, empresa, zona, direccion, fechaNacimiento, activo });
      exitosos.push({ fila: fila.__fila, id: nuevo.id, detalle: `${nombre} ${apellido}` });
    } catch (e) {
      errores.push({ fila: fila.__fila, errores: [e.message] });
    }
  }

  return { exitosos, errores, total: filas.length };
};

/* ═══════════════════════════════════════════════
   IMPORT EQUIPOS
═══════════════════════════════════════════════ */
const importarEquipos = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.getWorksheet("Equipos")
    || workbook.worksheets.find(s => s.name !== "Valores válidos")
    || workbook.worksheets[0];
  if (!ws) throw new Error("El archivo no contiene hojas.");

  const filas = parseSheet(ws);
  const exitosos = [];
  const errores = [];
  const noEncontrados = { paises: new Set(), clientes: new Set(), familias: new Set() };

  // Cargar catálogos una sola vez
  const [paises, clientes, familias] = await Promise.all([
    cargarPaises(),
    cargarClientes(),
    cargarFamilias(),
  ]);

  for (const fila of filas) {
    const errs = [];
    const f = (k) => cellStr(fila[k]);

    const codigo = f("codigo");
    const nombre = f("nombre");
    const numeroOV = f("numeroOV");
    const tipoEquipoPropiedad = f("tipoEquipoPropiedad");
    const paisNombre = f("pais");
    const clienteNombre = f("cliente");
    const familiaNombre = f("familia") || null;
    const tipoEquipo = f("tipoEquipo") || null;
    const marca = f("marca") || null;
    const modelo = f("modelo") || null;
    const serie = f("serie") || null;
    const linea = f("linea") || null;
    const lineaOtroTexto = f("lineaOtroTexto") || null;
    const creticidad = f("creticidad") || null;
    const status = f("status") || "Almacen";
    const estado = f("estado") || "No instalado";
    const descripcion = f("descripcion") || null;
    const sede = f("sede") || null;
    const almacen = f("almacen") || null;
    const operadorLogistico = f("operadorLogistico") || null;
    const idPlaca = f("idPlaca") || null;
    const id_cliente = f("id_cliente") || null;
    const fechaOV = cellDate(fila["fechaOV"]);
    const fechaEntregaPrevista = cellDate(fila["fechaEntregaPrevista"]);
    const fechaEntregaReal = cellDate(fila["fechaEntregaReal"]);
    const finGarantia = cellDate(fila["finGarantia"]);

    // Validaciones obligatorias
    if (!codigo) errs.push("codigo es obligatorio");
    if (!nombre) errs.push("nombre es obligatorio");
    if (!numeroOV) errs.push("numeroOV es obligatorio");
    if (!tipoEquipoPropiedad) errs.push("tipoEquipoPropiedad es obligatorio");
    else if (!TIPO_EQUIPO_PROPIEDAD.includes(tipoEquipoPropiedad))
      errs.push(`tipoEquipoPropiedad inválido: "${tipoEquipoPropiedad}". Valores: ${TIPO_EQUIPO_PROPIEDAD.join(", ")}`);
    if (!paisNombre) errs.push("pais es obligatorio");
    if (!clienteNombre) errs.push("cliente es obligatorio");

    // Validar ENUMs opcionales
    if (linea && !LINEA_EQUIPO.includes(linea))
      errs.push(`linea inválida: "${linea}". Valores: ${LINEA_EQUIPO.join(", ")}`);
    if (creticidad && !CRETICIDAD.includes(creticidad))
      errs.push(`creticidad inválida: "${creticidad}". Valores: ${CRETICIDAD.join(", ")}`);
    if (status && !STATUS_EQUIPO.includes(status))
      errs.push(`status inválido: "${status}". Valores: ${STATUS_EQUIPO.join(", ")}`);
    if (estado && !ESTADO_EQUIPO.includes(estado))
      errs.push(`estado inválido: "${estado}". Valores: ${ESTADO_EQUIPO.join(", ")}`);
    if (linea === "Otros" && !lineaOtroTexto)
      errs.push("lineaOtroTexto es obligatorio cuando linea es 'Otros'");

    if (errs.length) {
      errores.push({ fila: fila.__fila, errores: errs });
      continue;
    }

    // Resolver FKs — si no se encuentra, importar con null y avisar
    const pais = paisNombre ? resolverPais(paises, paisNombre) : null;
    const cliente = clienteNombre ? resolverCliente(clientes, clienteNombre) : null;
    const familia = familiaNombre ? resolverFamilia(familias, familiaNombre) : null;

    const advertencias = [];
    if (paisNombre && !pais) {
      advertencias.push(`país "${paisNombre}" no encontrado (quedó vacío)`);
      noEncontrados.paises.add(paisNombre);
    }
    if (clienteNombre && !cliente) {
      advertencias.push(`cliente "${clienteNombre}" no encontrado (quedó vacío)`);
      noEncontrados.clientes.add(clienteNombre);
    }
    if (familiaNombre && !familia) {
      advertencias.push(`familia "${familiaNombre}" no encontrada (quedó vacía)`);
      noEncontrados.familias.add(familiaNombre);
    }

    try {
      const nuevo = await Equipo.create({
        codigo,
        nombre,
        numeroOV,
        tipoEquipoPropiedad,
        paisId: pais ? pais.id : null,
        clienteId: cliente ? cliente.id : null,
        familiaId: familia ? familia.id : null,
        tipoEquipo,
        marca,
        modelo,
        serie,
        linea: linea || null,
        lineaOtroTexto,
        creticidad: creticidad || null,
        status,
        estado,
        descripcion,
        sede,
        almacen,
        operadorLogistico,
        idPlaca,
        id_cliente,
        fechaOV,
        fechaEntregaPrevista,
        fechaEntregaReal,
        finGarantia,
      });
      const detalle = advertencias.length
        ? `${codigo} - ${nombre} ⚠️ ${advertencias.join("; ")}`
        : `${codigo} - ${nombre}`;
      exitosos.push({ fila: fila.__fila, id: nuevo.id, detalle, advertencias });
    } catch (e) {
      errores.push({ fila: fila.__fila, errores: [e.message] });
    }
  }

  // Resumen de valores únicos que no se encontraron (para hacer Find & Replace en Excel)
  const resumenNoEncontrados = {};
  if (noEncontrados.paises.size)
    resumenNoEncontrados.paises = { valores: [...noEncontrados.paises], disponibles: paises.map(p => p.nombre) };
  if (noEncontrados.clientes.size)
    resumenNoEncontrados.clientes = { valores: [...noEncontrados.clientes], disponibles: clientes.map(c => c.razonSocial) };
  if (noEncontrados.familias.size)
    resumenNoEncontrados.familias = { valores: [...noEncontrados.familias], disponibles: familias.map(f => f.nombre) };

  return { exitosos, errores, total: filas.length, resumenNoEncontrados };
};

/* ═══════════════════════════════════════════════
   IMPORT UBICACIONES TÉCNICAS
═══════════════════════════════════════════════ */
const importarUbicaciones = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.getWorksheet("Ubicaciones Tecnicas")
    || workbook.worksheets.find(s => s.name !== "Valores válidos")
    || workbook.worksheets[0];
  if (!ws) throw new Error("El archivo no contiene hojas.");

  const filas = parseSheet(ws);
  const exitosos = [];
  const errores = [];

  const [paises, clientes] = await Promise.all([cargarPaises(), cargarClientes()]);

  for (const fila of filas) {
    const errs = [];
    const f = (k) => cellStr(fila[k]);

    const codigo = f("codigo");
    const nombre = f("nombre");
    const numeroOV = f("numeroOV");
    const tipoEquipoPropiedad = f("tipoEquipoPropiedad");
    const paisNombre = f("pais");
    const clienteNombre = f("cliente");
    const especialidad = f("especialidad") || null;
    const descripcion = f("descripcion") || null;
    const sede = f("sede") || null;
    const almacen = f("almacen") || null;
    const operadorLogistico = f("operadorLogistico") || null;
    const idPlaca = f("idPlaca") || null;
    const id_cliente = f("id_cliente") || null;
    const fechaOV = cellDate(fila["fechaOV"]);
    const fechaEntregaPrevista = cellDate(fila["fechaEntregaPrevista"]);
    const fechaEntregaReal = cellDate(fila["fechaEntregaReal"]);
    const finGarantia = cellDate(fila["finGarantia"]);

    if (!codigo) errs.push("codigo es obligatorio");
    if (!nombre) errs.push("nombre es obligatorio");
    if (!numeroOV) errs.push("numeroOV es obligatorio");
    if (!tipoEquipoPropiedad) errs.push("tipoEquipoPropiedad es obligatorio");
    else if (!TIPO_EQUIPO_PROPIEDAD.includes(tipoEquipoPropiedad))
      errs.push(`tipoEquipoPropiedad inválido: "${tipoEquipoPropiedad}". Valores: ${TIPO_EQUIPO_PROPIEDAD.join(", ")}`);

    if (errs.length) {
      errores.push({ fila: fila.__fila, errores: errs });
      continue;
    }

    // Resolver FKs — si no se encuentra, importar con null y avisar
    const pais = paisNombre ? resolverPais(paises, paisNombre) : null;
    const cliente = clienteNombre ? resolverCliente(clientes, clienteNombre) : null;

    const advertencias = [];
    if (paisNombre && !pais)
      advertencias.push(`país "${paisNombre}" no encontrado (quedó vacío)`);
    if (clienteNombre && !cliente)
      advertencias.push(`cliente "${clienteNombre}" no encontrado (quedó vacío)`);

    try {
      // Verificar unicidad de código
      const existente = await UbicacionTecnica.findOne({ where: { codigo } });
      if (existente) {
        errores.push({ fila: fila.__fila, errores: [`El código "${codigo}" ya está registrado`] });
        continue;
      }
      const nuevo = await UbicacionTecnica.create({
        codigo,
        nombre,
        numeroOV,
        tipoEquipoPropiedad,
        paisId: pais ? pais.id : null,
        clienteId: cliente ? cliente.id : null,
        especialidad,
        descripcion,
        sede,
        almacen,
        operadorLogistico,
        idPlaca,
        id_cliente,
        fechaOV,
        fechaEntregaPrevista,
        fechaEntregaReal,
        finGarantia,
      });
      const detalle = advertencias.length
        ? `${codigo} - ${nombre} ⚠️ ${advertencias.join("; ")}`
        : `${codigo} - ${nombre}`;
      exitosos.push({ fila: fila.__fila, id: nuevo.id, detalle, advertencias });
    } catch (e) {
      errores.push({ fila: fila.__fila, errores: [e.message] });
    }
  }

  return { exitosos, errores, total: filas.length };
};

/* ═══════════════════════════════════════════════
   GENERAR PLANTILLA EXCEL
═══════════════════════════════════════════════ */
const generarPlantilla = async (entidad) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema";

  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      bottom: { style: "thin", color: { argb: "FF64748B" } },
      right: { style: "thin", color: { argb: "FF64748B" } },
    },
  };

  const reqStyle = {
    ...headerStyle,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } },
  };

  const exampleStyle = {
    font: { italic: true, color: { argb: "FF64748B" }, size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
  };

  const validSheet = workbook.addWorksheet("Valores válidos");

  if (entidad === "trabajadores") {
    const ws = workbook.addWorksheet("Trabajadores");
    workbook.views = [{ activeTab: 1 }];

    const cols = [
      { key: "nombre",          req: true,  width: 20, ejemplo: "Juan" },
      { key: "apellido",        req: true,  width: 20, ejemplo: "Pérez" },
      { key: "dni",             req: true,  width: 15, ejemplo: "12345678" },
      { key: "rol",             req: true,  width: 28, ejemplo: "tecnico_electrico" },
      { key: "empresa",         req: false, width: 20, ejemplo: "Interno" },
      { key: "zona",            req: false, width: 15, ejemplo: "Lima Norte" },
      { key: "direccion",       req: false, width: 30, ejemplo: "Av. Ejemplo 123" },
      { key: "fechaNacimiento", req: false, width: 18, ejemplo: "1990-05-15" },
      { key: "activo",          req: false, width: 10, ejemplo: "true" },
    ];

    // Escribir cabeceras manualmente (key exacto, sin asterisco)
    ws.getRow(1).height = 30;
    cols.forEach((col, i) => {
      const cell = ws.getRow(1).getCell(i + 1);
      cell.value = col.key;
      cell.style = col.req ? reqStyle : headerStyle;
      ws.getColumn(i + 1).width = col.width;
    });

    // Fila de ejemplo
    const ejRow = ws.addRow(cols.map((c) => c.ejemplo));
    ejRow.eachCell((cell) => { cell.style = exampleStyle; });

    // Validación dropdown para rol
    const rolColIdx = cols.findIndex((c) => c.key === "rol") + 1;
    for (let r = 3; r <= 500; r++) {
      ws.getCell(r, rolColIdx).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"tecnico_electrico,tecnico_mecanico,operario_de_mantenimiento,supervisor"'],
        showErrorMessage: true,
        errorTitle: "Valor inválido",
        error: "Selecciona un rol de la lista",
      };
    }

    // Hoja valores válidos
    validSheet.addRow(["Campo", "Valores válidos"]);
    validSheet.getRow(1).font = { bold: true };
    validSheet.addRow(["rol", ROLES_VALIDOS.join(", ")]);
    validSheet.addRow(["activo", "true, false"]);
    validSheet.addRow(["fechaNacimiento", "Formato: YYYY-MM-DD (ej: 1990-05-15)"]);
    validSheet.columns = [{ width: 20 }, { width: 70 }];

  } else if (entidad === "equipos") {
    const ws = workbook.addWorksheet("Equipos");
    workbook.views = [{ activeTab: 1 }];

    const cols = [
      { key: "codigo",               req: true,  width: 15, ejemplo: "EQ-001" },
      { key: "nombre",               req: true,  width: 30, ejemplo: "Equipo Ejemplo" },
      { key: "numeroOV",             req: true,  width: 15, ejemplo: "OV-12345" },
      { key: "cliente",              req: true,  width: 30, ejemplo: "Empresa ABC SAC" },
      { key: "pais",                 req: true,  width: 15, ejemplo: "Perú" },
      { key: "tipoEquipoPropiedad",  req: true,  width: 22, ejemplo: "Vendido" },
      { key: "familia",              req: false, width: 20, ejemplo: "Bombas" },
      { key: "tipoEquipo",           req: false, width: 20, ejemplo: "Industrial" },
      { key: "marca",                req: false, width: 15, ejemplo: "Siemens" },
      { key: "modelo",               req: false, width: 15, ejemplo: "S7-300" },
      { key: "serie",                req: false, width: 15, ejemplo: "SN-001" },
      { key: "linea",                req: false, width: 12, ejemplo: "Acceso" },
      { key: "lineaOtroTexto",       req: false, width: 18, ejemplo: "" },
      { key: "creticidad",           req: false, width: 12, ejemplo: "A" },
      { key: "status",               req: false, width: 14, ejemplo: "Almacen" },
      { key: "estado",               req: false, width: 16, ejemplo: "No instalado" },
      { key: "descripcion",          req: false, width: 30, ejemplo: "Equipo de prueba" },
      { key: "sede",                 req: false, width: 20, ejemplo: "Lima" },
      { key: "almacen",              req: false, width: 15, ejemplo: "ALM-01" },
      { key: "operadorLogistico",    req: false, width: 20, ejemplo: "" },
      { key: "idPlaca",              req: false, width: 12, ejemplo: "ABC-123" },
      { key: "id_cliente",           req: false, width: 15, ejemplo: "CLI-001" },
      { key: "fechaOV",              req: false, width: 14, ejemplo: "2024-01-15" },
      { key: "fechaEntregaPrevista", req: false, width: 20, ejemplo: "2024-03-01" },
      { key: "fechaEntregaReal",     req: false, width: 18, ejemplo: "" },
      { key: "finGarantia",          req: false, width: 14, ejemplo: "2025-01-15" },
    ];

    ws.getRow(1).height = 30;
    cols.forEach((col, i) => {
      const cell = ws.getRow(1).getCell(i + 1);
      cell.value = col.key;
      cell.style = col.req ? reqStyle : headerStyle;
      ws.getColumn(i + 1).width = col.width;
    });

    const ejRow = ws.addRow(cols.map((c) => c.ejemplo));
    ejRow.eachCell((cell) => { cell.style = exampleStyle; });

    // Dropdowns para ENUMs
    const addDropdown = (colKey, values) => {
      const idx = cols.findIndex((c) => c.key === colKey) + 1;
      const formula = `"${values.join(",")}"`;
      for (let r = 3; r <= 500; r++) {
        ws.getCell(r, idx).dataValidation = {
          type: "list", allowBlank: true, formulae: [formula],
          showErrorMessage: true, errorTitle: "Valor inválido",
          error: `Valores válidos: ${values.join(", ")}`,
        };
      }
    };

    addDropdown("tipoEquipoPropiedad", TIPO_EQUIPO_PROPIEDAD);
    addDropdown("linea", LINEA_EQUIPO);
    addDropdown("creticidad", CRETICIDAD);
    addDropdown("status", STATUS_EQUIPO);
    addDropdown("estado", ESTADO_EQUIPO);

    // Hoja valores válidos
    validSheet.addRow(["Campo", "Valores válidos", "Notas"]);
    validSheet.getRow(1).font = { bold: true };
    validSheet.addRow(["tipoEquipoPropiedad", TIPO_EQUIPO_PROPIEDAD.join(", "), "Obligatorio"]);
    validSheet.addRow(["linea", LINEA_EQUIPO.join(", "), "Si pones 'Otros', completa lineaOtroTexto"]);
    validSheet.addRow(["creticidad", CRETICIDAD.join(", "), "Opcional"]);
    validSheet.addRow(["status", STATUS_EQUIPO.join(", "), "Default: Almacen"]);
    validSheet.addRow(["estado", ESTADO_EQUIPO.join(", "), "Default: No instalado"]);
    validSheet.addRow(["pais", "Nombre completo del país o código de 3 letras (ej: Perú o PER)", "Obligatorio"]);
    validSheet.addRow(["cliente", "Razón social exacta o código SAP del cliente", "Obligatorio"]);
    validSheet.addRow(["familia", "Nombre exacto de la familia de equipos", "Opcional"]);
    validSheet.addRow(["Fechas", "Formato YYYY-MM-DD", "Ej: 2024-01-15"]);
    validSheet.columns = [{ width: 22 }, { width: 60 }, { width: 40 }];

  } else if (entidad === "ubicaciones") {
    const ws = workbook.addWorksheet("Ubicaciones Tecnicas");
    workbook.views = [{ activeTab: 1 }];

    const cols = [
      { key: "codigo",               req: true,  width: 15, ejemplo: "UT-001" },
      { key: "nombre",               req: true,  width: 30, ejemplo: "Ubicación Ejemplo" },
      { key: "numeroOV",             req: true,  width: 15, ejemplo: "OV-12345" },
      { key: "cliente",              req: true,  width: 30, ejemplo: "Empresa ABC SAC" },
      { key: "pais",                 req: true,  width: 15, ejemplo: "Perú" },
      { key: "tipoEquipoPropiedad",  req: true,  width: 22, ejemplo: "Vendido" },
      { key: "especialidad",         req: false, width: 20, ejemplo: "Eléctrica" },
      { key: "descripcion",          req: false, width: 30, ejemplo: "Descripción" },
      { key: "sede",                 req: false, width: 20, ejemplo: "Lima" },
      { key: "almacen",              req: false, width: 15, ejemplo: "" },
      { key: "operadorLogistico",    req: false, width: 20, ejemplo: "" },
      { key: "idPlaca",              req: false, width: 12, ejemplo: "" },
      { key: "id_cliente",           req: false, width: 15, ejemplo: "" },
      { key: "fechaOV",              req: false, width: 14, ejemplo: "2024-01-15" },
      { key: "fechaEntregaPrevista", req: false, width: 20, ejemplo: "" },
      { key: "fechaEntregaReal",     req: false, width: 18, ejemplo: "" },
      { key: "finGarantia",          req: false, width: 14, ejemplo: "" },
    ];

    ws.getRow(1).height = 30;
    cols.forEach((col, i) => {
      const cell = ws.getRow(1).getCell(i + 1);
      cell.value = col.key;
      cell.style = col.req ? reqStyle : headerStyle;
      ws.getColumn(i + 1).width = col.width;
    });

    const ejRow = ws.addRow(cols.map((c) => c.ejemplo));
    ejRow.eachCell((cell) => { cell.style = exampleStyle; });

    const addDropdown = (colKey, values) => {
      const idx = cols.findIndex((c) => c.key === colKey) + 1;
      const formula = `"${values.join(",")}"`;
      for (let r = 3; r <= 500; r++) {
        ws.getCell(r, idx).dataValidation = {
          type: "list", allowBlank: true, formulae: [formula],
          showErrorMessage: true, errorTitle: "Valor inválido",
          error: `Valores válidos: ${values.join(", ")}`,
        };
      }
    };

    addDropdown("tipoEquipoPropiedad", TIPO_EQUIPO_PROPIEDAD);

    validSheet.addRow(["Campo", "Valores válidos", "Notas"]);
    validSheet.getRow(1).font = { bold: true };
    validSheet.addRow(["tipoEquipoPropiedad", TIPO_EQUIPO_PROPIEDAD.join(", "), "Obligatorio"]);
    validSheet.addRow(["pais", "Nombre completo del país o código (ej: Perú o PER)", "Obligatorio"]);
    validSheet.addRow(["cliente", "Razón social exacta o código SAP del cliente", "Obligatorio"]);
    validSheet.addRow(["Fechas", "Formato YYYY-MM-DD", "Ej: 2024-01-15"]);
    validSheet.columns = [{ width: 22 }, { width: 60 }, { width: 40 }];
  }

  // Freeze primera fila en todas las hojas
  workbook.worksheets.forEach((sheet) => {
    if (sheet.name !== "Valores válidos") sheet.views = [{ state: "frozen", ySplit: 1 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  importarTrabajadores,
  importarEquipos,
  importarUbicaciones,
  generarPlantilla,
};
