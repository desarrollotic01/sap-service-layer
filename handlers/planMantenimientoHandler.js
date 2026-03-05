const {
  crearPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
  actualizarPlanesDeEquipo,
    cambiarEstadoPlan,
} = require("../controllers/planMantenimientoController");

/* =========================================================
   CREAR PLAN
========================================================= */
const crearPlanHandler = async (req, res) => {
  try {
    const plan = await crearPlan(req.body);
    return res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message }); // ✅ 400 si es validación
  }
};

/* =========================================================
   OBTENER PLANES
========================================================= */
const obtenerPlanesHandler = async (_req, res) => {
  try {
    const planes = await obtenerPlanes();
    return res.json(planes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

/* =========================================================
   OBTENER PLAN POR ID
========================================================= */
const obtenerPlanPorIdHandler = async (req, res) => {
  try {
    const plan = await obtenerPlanPorId(req.params.id);
    return res.json(plan);
  } catch (error) {
    // si tu controller lanza "Plan no encontrado"
    if (error.message?.toLowerCase().includes("no encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

/* =========================================================
   OBTENER PLANES POR EQUIPO
========================================================= */
const obtenerPlanesPorEquipoHandler = async (req, res) => {
  try {
    const planes = await obtenerPlanesPorEquipo(req.params.equipoId);
    return res.json(planes);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   OBTENER MEJOR PLAN POR EQUIPO
========================================================= */
const obtenerMejorPlanPorEquipoHandler = async (req, res) => {
  try {
    const plan = await obtenerMejorPlanPorEquipo(req.params.equipoId);
    return res.json(plan); // puede ser null y está ok
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   ACTUALIZAR PLANES DE UN EQUIPO
   (setPlanesMantenimiento)
========================================================= */
const actualizarPlanesMantenimientoEquipo = async (req, res) => {
  try {
    const { id } = req.params; // id del equipo
    const { planesMantenimientoIds } = req.body;

    const result = await actualizarPlanesDeEquipo(id, planesMantenimientoIds); // ✅ CORRECTO

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

const cambiarEstadoPlanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body || {};

    const plan = await cambiarEstadoPlan({ id, activo });

    return res.json({
      message: `Plan ${plan.activo ? "activado" : "desactivado"} correctamente`,
      plan,
    });
  } catch (error) {
    // 404 si no existe
    if (error.message?.toLowerCase().includes("no encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  crearPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler,
  actualizarPlanesMantenimientoEquipo,
  cambiarEstadoPlanHandler,
};