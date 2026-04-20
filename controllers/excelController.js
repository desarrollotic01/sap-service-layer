const { ExcelConfig } = require("../db_connection");
const { generateExcel, FIELD_DEFINITIONS, MODULOS_VALIDOS } = require("../services/excelService");

/* ============================================================
   OBTENER CAMPOS DISPONIBLES DEL MÓDULO
============================================================ */
const getFields = (modulo) => {
  const def = FIELD_DEFINITIONS[modulo];
  if (!def) throw new Error(`Módulo '${modulo}' no válido`);

  const result = {};
  for (const sheet of def.sheets) {
    result[sheet.key] = {
      label: sheet.label,
      fields: def.fields[sheet.key].map((f) => ({
        key: f.key,
        label: f.label,
        ...(f.group ? { group: f.group } : {}),
      })),
    };
  }
  return result;
};

/* ============================================================
   OBTENER CONFIGURACIÓN GUARDADA
============================================================ */
const getConfig = async (userId, modulo) => {
  if (!MODULOS_VALIDOS.includes(modulo)) {
    throw new Error(`Módulo '${modulo}' no válido`);
  }

  const config = await ExcelConfig.findOne({ where: { userId, modulo } });
  if (!config) return null;
  return config;
};

/* ============================================================
   GUARDAR / ACTUALIZAR CONFIGURACIÓN
============================================================ */
const saveConfig = async (userId, modulo, campos, filters) => {
  if (!MODULOS_VALIDOS.includes(modulo)) {
    throw new Error(`Módulo '${modulo}' no válido`);
  }

  const [config] = await ExcelConfig.upsert(
    { userId, modulo, campos: campos || {}, filters: filters || {} },
    { conflictFields: ["userId", "modulo"] }
  );

  return config;
};

/* ============================================================
   EXPORTAR EXCEL
============================================================ */
const exportExcel = async (modulo, campos, filters) => {
  if (!MODULOS_VALIDOS.includes(modulo)) {
    throw new Error(`Módulo '${modulo}' no válido`);
  }

  const workbook = await generateExcel(modulo, campos, filters);
  return workbook;
};

module.exports = { getFields, getConfig, saveConfig, exportExcel };
