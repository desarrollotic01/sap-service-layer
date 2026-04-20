const excelController = require("../controllers/excelController");

/* ============================================================
   GET /excel/:modulo/fields
   Devuelve los campos disponibles para configurar
============================================================ */
const getFieldsHandler = (req, res) => {
  try {
    const { modulo } = req.params;
    const fields = excelController.getFields(modulo);
    res.json(fields);
  } catch (error) {
    res.status(400).json({ errors: [error.message] });
  }
};

/* ============================================================
   GET /excel/:modulo/config
   Devuelve la config guardada del usuario actual
============================================================ */
const getConfigHandler = async (req, res) => {
  try {
    const { modulo } = req.params;
    const userId = req.user.id;

    const config = await excelController.getConfig(userId, modulo);
    res.json(config);
  } catch (error) {
    res.status(400).json({ errors: [error.message] });
  }
};

/* ============================================================
   PUT /excel/:modulo/config
   Guarda la configuración del usuario
   Body: { campos: { principal: [...], actividades: [...] }, filters: {...} }
============================================================ */
const saveConfigHandler = async (req, res) => {
  try {
    const { modulo } = req.params;
    const userId = req.user.id;
    const { campos, filters } = req.body;

    const config = await excelController.saveConfig(userId, modulo, campos, filters);
    res.json(config);
  } catch (error) {
    res.status(400).json({ errors: [error.message] });
  }
};

/* ============================================================
   GET /excel/:modulo/export
   Genera y descarga el Excel
   Query params: campos (JSON stringificado) + filtros individuales
   Ejemplo: ?campos={"principal":["numeroOT","estado"]}&estado=CREADO&fechaDesde=2025-01-01
============================================================ */
const exportHandler = async (req, res) => {
  try {
    const { modulo } = req.params;
    const userId = req.user.id;

    // Campos: pueden venir en query o se usa la config guardada
    let campos = {};
    if (req.query.campos) {
      try {
        campos = JSON.parse(req.query.campos);
      } catch {
        return res.status(400).json({ errors: ["Formato de campos inválido"] });
      }
    } else {
      // Usar config guardada
      const config = await excelController.getConfig(userId, modulo);
      if (config) {
        campos = config.campos || {};
      }
    }

    // Filtros: el resto de query params (excepto "campos")
    const { campos: _ignorar, ...filters } = req.query;

    const workbook = await excelController.exportExcel(modulo, campos, filters);

    const filename = `${modulo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ errors: [error.message] });
    }
  }
};

module.exports = {
  getFieldsHandler,
  getConfigHandler,
  saveConfigHandler,
  exportHandler,
};
