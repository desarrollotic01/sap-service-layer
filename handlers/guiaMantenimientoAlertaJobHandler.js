const { Op } = require("sequelize");
const {
  sequelize,
  GuiaMantenimientoProgramacion,
  GuiaMantenimiento,
  Aviso,
  AvisoEquipo,
  AvisoUbicacion,
} = require("../db_connection");

const BuildNumeroAviso = async (t) => {
  const year = new Date().getFullYear();
  const prefix = `AV-${year}-`;

  const last = await Aviso.findOne({
    where: {
      numeroAviso: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["createdAt", "DESC"]],
    transaction: t,
  });

  let nextN = 1;

  if (last?.numeroAviso) {
    const num = parseInt(String(last.numeroAviso).replace(prefix, ""), 10);
    if (Number.isFinite(num)) nextN = num + 1;
  }

  return `${prefix}${String(nextN).padStart(5, "0")}`;
};

const BuildPrioridadFromCriticidad = (creticidad) => {
  if (creticidad === "A") return "Alta";
  if (creticidad === "B") return "Media";
  return "Baja";
};

const JobCrearAvisosDesdeAlertasGuiaMantenimientoHandler = async (req, res) => {
  try {
    const now = new Date();

    const programaciones = await GuiaMantenimientoProgramacion.findAll({
      where: {
        state: true,
        estado: "PENDIENTE",
        alertaDisparada: false,
        fechaAlertaCalculada: {
          [Op.lte]: now,
        },
      },
      include: [
        {
          model: GuiaMantenimiento,
          as: "guia",
        },
      ],
      order: [["fechaAlertaCalculada", "ASC"]],
    });

    let creados = 0;

    await sequelize.transaction(async (t) => {
      for (const prog of programaciones) {
        const guia = prog.guia;

        if (!guia || guia.state === false) continue;
        if (!guia.alertaActiva) continue;

        const numeroAviso = await BuildNumeroAviso(t);

        const aviso = await Aviso.create(
          {
            tipoAviso: "mantenimiento",
            origenAviso: "guia",
            guiaMantenimientoId: guia.id,
            guiaMantenimientoProgramacionId: prog.id,
            ordenVenta: guia.ordenVenta,
            numeroAviso,
            descripcionResumida: guia.descripcion,
            descripcion: guia.descripcionDetallada || guia.descripcion,
            prioridad: BuildPrioridadFromCriticidad(guia.creticidad),
            tipoMantenimiento: "Preventivo",
            producto: guia.producto,
            fechaAtencion: prog.fechaProgramada,
            paisId: guia.paisId,
            creadoPor: guia.solicitanteId,
            solicitanteId: guia.solicitanteId,
            estadoAviso: "creado",
            documentos: [],
          },
          { transaction: t }
        );

        if (guia.equipoId) {
          await AvisoEquipo.create(
            {
              avisoId: aviso.id,
              equipoId: guia.equipoId,
            },
            { transaction: t }
          );
        }

        if (guia.ubicacionTecnicaId) {
          await AvisoUbicacion.create(
            {
              avisoId: aviso.id,
              ubicacionId: guia.ubicacionTecnicaId,
            },
            { transaction: t }
          );
        }

        await prog.update(
          {
            alertaDisparada: true,
            avisoId: aviso.id,
          },
          { transaction: t }
        );

        creados++;
      }
    });

    return res.status(200).json({
      message: "Job de alertas ejecutado correctamente.",
      avisosCreados: creados,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  JobCrearAvisosDesdeAlertasGuiaMantenimientoHandler,
};