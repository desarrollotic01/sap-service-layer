const {
  crearPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo
} = require("../controllers/planMantenimientoController");

const crearPlanHandler = async (req, res) => {
  try {
    const plan = await crearPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const obtenerPlanesHandler = async (_req, res) => {
  try {
    const planes = await obtenerPlanes();
    res.json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerPlanPorIdHandler = async (req, res) => {
  try {
    const plan = await obtenerPlanPorId(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan no encontrado" });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerPlanesPorEquipoHandler = async (req, res) => {
  try {
    const planes = await obtenerPlanesPorEquipo(req.params.equipoId);
    res.json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const obtenerMejorPlanPorEquipoHandler = async (req, res) => {
  try {
    const plan = await obtenerMejorPlanPorEquipo(req.params.equipoId);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  crearPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler
};
