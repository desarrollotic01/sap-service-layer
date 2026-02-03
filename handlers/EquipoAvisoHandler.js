
const { getEquiposDisponiblesPorAviso } = require("../controllers/EquipoAvisoController");


const getEquiposDisponiblesHandler = async (req, res) => {
  try {
    const { avisoId } = req.params;
    const equipos = await getEquiposDisponiblesPorAviso(avisoId);
    res.json(equipos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getEquiposDisponiblesHandler,
};  
