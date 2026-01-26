const TratamientoController = require("../controllers/tratamientoController");

const crearTratamiento = async (req, res) => {
  try {
    const result = await TratamientoController.crearTratamiento({
      avisoId: req.params.avisoId,
      body: req.body,
      usuarioId: req.user.id, // asumimos auth middleware
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message,
    });
  }
};

const obtenerTratamiento = async (req, res) => {
  try {
    const result = await TratamientoController.obtenerTratamientoPorAviso(
      req.params.avisoId
    );

    if (!result) {
      return res.status(404).json({
        message: "Tratamiento no encontrado",
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  crearTratamiento,
  obtenerTratamiento,
};
