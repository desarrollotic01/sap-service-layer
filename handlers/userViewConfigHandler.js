const {
  obtenerConfig,
  guardarConfig,
  resetFiltros,
} = require("../controllers/userViewConfigController");

/* =============================
   GET CONFIG
============================= */
async function getConfigHandler(req, res) {
  const errors = [];

  try {
    const userId = req.user.id;
    const { view } = req.params;

    if (!view) errors.push("La vista es obligatoria");

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const config = await obtenerConfig(userId, view);
    res.json(config);
  } catch (err) {
    console.error(err);
    errors.push("Error al obtener configuración");
    res.status(500).json({ errors });
  }
}

/* =============================
   SAVE CONFIG
============================= */
async function saveConfigHandler(req, res) {
  const errors = [];

  try {
    const userId = req.user.id;
    const { view } = req.params;
    const data = req.body;

    if (!view) errors.push("La vista es obligatoria");

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const config = await guardarConfig(userId, view, data);
    res.json(config);
  } catch (err) {
    console.error(err);
    errors.push("Error al guardar configuración");
    res.status(500).json({ errors });
  }
}

/* =============================
   RESET FILTROS
============================= */
async function resetFiltrosHandler(req, res) {
  const errors = [];

  try {
    const userId = req.user.id;
    const { view } = req.params;

    if (!view) errors.push("La vista es obligatoria");

    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const config = await resetFiltros(userId, view);
    res.json(config);
  } catch (err) {
    console.error(err);
    errors.push("Error al restablecer filtros");
    res.status(500).json({ errors });
  }
}

module.exports = {
  getConfigHandler,
  saveConfigHandler,
  resetFiltrosHandler,
};