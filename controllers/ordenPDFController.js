const path = require("path");
const { generarOrdenTrabajoPDF } = require("../services/OrdenTrabajoPdf");
const {
  OrdenTrabajo,
  OrdenTrabajoEquipo,
  OrdenTrabajoActividad,
  OrdenTrabajoEquipoTrabajador,
  Equipo,
  Trabajador
} = require("../db_connection");

const generarOT = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Traer OT completa con relaciones
    const orden = await OrdenTrabajo.findByPk(id, {
      include: [
        {
          model: OrdenTrabajoEquipo,
          as: "equipos",
          include: [
            {
              model: Equipo,
              as: "equipo",
            },
            {
              model: OrdenTrabajoActividad,
              as: "actividades",
            },
            {
              model: OrdenTrabajoEquipoTrabajador,
              as: "trabajadores",
              include: [
                {
                 model: Trabajador,
  as: "trabajador",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!orden) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    // 🔥 Generar PDF
    const filePath = await generarOrdenTrabajoPDF(orden);

    // 🔥 Enviar PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${orden.numeroOT}.pdf"`
    );

    return res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error("❌ Error generando PDF:", error);

    return res.status(500).json({
      message: "Error generando PDF",
      error: error.message,
    });
  }
};

module.exports = {
  generarOT,
};