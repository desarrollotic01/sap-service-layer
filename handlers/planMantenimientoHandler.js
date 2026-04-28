const {
  crearPlan,
  actualizarPlan,
  obtenerPlanes,
  obtenerPlanPorId,
  obtenerPlanesPorEquipo,
  obtenerMejorPlanPorEquipo,
  obtenerPlanesPorUbicacionTecnica,
  obtenerMejorPlanPorUbicacionTecnica,
  actualizarPlanesDeEquipo,
  actualizarPlanesDeUbicacionTecnica,
  cambiarEstadoPlan,
} = require("../controllers/planMantenimientoController");
const deleteUploadedFiles = require("../middlewares/deleteUploadedFiles");

/* =========================================================
   CREAR PLAN
========================================================= */
const crearPlanHandler = async (req, res) => {
  try {
    const plan = await crearPlan(req.body, req.files || []);
    return res.status(201).json(plan);
  } catch (error) {
    deleteUploadedFiles(req.files || []);
    console.error(error);
    return res.status(400).json({ error: error.message });
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
    return res.json(plan);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   ACTUALIZAR PLAN COMPLETO
========================================================= */
const actualizarPlanHandler = async (req, res) => {
  try {
    const plan = await actualizarPlan(req.params.id, req.body, req.files || []);
    return res.json(plan);
  } catch (error) {
    deleteUploadedFiles(req.files || []);
    if (error.message?.toLowerCase().includes("no encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   ACTUALIZAR PLANES DE UN EQUIPO
========================================================= */
const actualizarPlanesMantenimientoEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { planesMantenimientoIds } = req.body;

    const result = await actualizarPlanesDeEquipo(id, planesMantenimientoIds);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   CAMBIAR ESTADO PLAN
========================================================= */
const cambiarEstadoPlanHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body || {};

    let activoNormalizado = activo;

    if (activo === "true") activoNormalizado = true;
    if (activo === "false") activoNormalizado = false;

    const plan = await cambiarEstadoPlan({ id, activo: activoNormalizado });

    return res.json({
      message: `Plan ${plan.activo ? "activado" : "desactivado"} correctamente`,
      plan,
    });
  } catch (error) {
    if (error.message?.toLowerCase().includes("no encontrado")) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   OBTENER PLANES POR UBICACION TECNICA
========================================================= */
const obtenerPlanesPorUbicacionTecnicaHandler = async (req, res) => {
  try {
    const planes = await obtenerPlanesPorUbicacionTecnica(req.params.ubicacionTecnicaId);
    return res.json(planes);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   OBTENER MEJOR PLAN POR UBICACION TECNICA
========================================================= */
const obtenerMejorPlanPorUbicacionTecnicaHandler = async (req, res) => {
  try {
    const plan = await obtenerMejorPlanPorUbicacionTecnica(req.params.ubicacionTecnicaId);
    return res.json(plan);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

/* =========================================================
   ACTUALIZAR PLANES DE UNA UBICACION TECNICA
========================================================= */
const actualizarPlanesMantenimientoUbicacionTecnica = async (req, res) => {
  try {
    const { id } = req.params;
    const { planesMantenimientoIds } = req.body;

    const result = await actualizarPlanesDeUbicacionTecnica(id, planesMantenimientoIds);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  crearPlanHandler,
  actualizarPlanHandler,
  obtenerPlanesHandler,
  obtenerPlanPorIdHandler,
  obtenerPlanesPorEquipoHandler,
  obtenerMejorPlanPorEquipoHandler,
  obtenerPlanesPorUbicacionTecnicaHandler,
  obtenerMejorPlanPorUbicacionTecnicaHandler,
  actualizarPlanesMantenimientoEquipo,
  actualizarPlanesMantenimientoUbicacionTecnica,
  cambiarEstadoPlanHandler,
};