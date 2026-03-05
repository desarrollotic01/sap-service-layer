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

const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const validarLineasSolicitud = (lineas, label) => {
  if (!Array.isArray(lineas)) throw new Error(`${label}: lineas debe ser un arreglo`);
  if (lineas.length === 0) throw new Error(`${label}: debe tener al menos una línea`);

  for (const [i, l] of lineas.entries()) {
    const n = i + 1;
    if (!l.itemCode && !l.description) {
      throw new Error(`${label} línea ${n}: itemCode o description obligatorio`);
    }
    const q = Number(l.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      throw new Error(`${label} línea ${n}: quantity debe ser > 0`);
    }
  }
};

const guardarCambiosTratamientoHandler = async (req, res) => {
  try {
    const { tratamientoId } = req.params;
    const usuarioId = req.user?.id || req.body?.usuarioId;

    if (!tratamientoId) return res.status(400).json({ message: "tratamientoId es obligatorio" });
    if (!isUuid(tratamientoId)) return res.status(400).json({ message: "tratamientoId inválido" });
    if (!usuarioId) return res.status(400).json({ message: "usuarioId es obligatorio" });

    const { actividades, solicitudGeneral, solicitudesPorEquipo } = req.body || {};

    // ✅ ACTIVIDADES (opcional, pero si viene, valida)
    if (actividades !== undefined) {
      if (!Array.isArray(actividades)) {
        return res.status(400).json({ message: "actividades debe ser un arreglo" });
      }

      for (const [i, a] of actividades.entries()) {
        if (!a?.id) return res.status(400).json({ message: `Actividad ${i + 1}: id obligatorio` });
        if (!isUuid(a.id)) return res.status(400).json({ message: `Actividad ${i + 1}: id inválido` });

        if (a.unidadDuracion && !["min", "h"].includes(a.unidadDuracion)) {
          return res.status(400).json({ message: `Actividad ${i + 1}: unidadDuracion inválida` });
        }

        if (a.duracionEstimadaValor !== undefined && a.duracionEstimadaValor !== null) {
          const v = Number(a.duracionEstimadaValor);
          if (!Number.isFinite(v) || v <= 0) {
            return res.status(400).json({ message: `Actividad ${i + 1}: duracionEstimadaValor debe ser > 0` });
          }
        }

        if (a.cantidadTecnicos !== undefined && a.cantidadTecnicos !== null) {
          const c = Number(a.cantidadTecnicos);
          if (!Number.isFinite(c) || c <= 0) {
            return res.status(400).json({ message: `Actividad ${i + 1}: cantidadTecnicos debe ser > 0` });
          }
        }

        if (a.estado && !["PENDIENTE", "LISTA", "OMITIDA"].includes(a.estado)) {
          return res.status(400).json({ message: `Actividad ${i + 1}: estado inválido` });
        }

        if (
          a.rolTecnico &&
          !["tecnico_electrico", "operario_de_mantenimiento", "tecnico_mecanico", "supervisor"].includes(a.rolTecnico)
        ) {
          return res.status(400).json({ message: `Actividad ${i + 1}: rolTecnico inválido` });
        }
      }
    }

    // ✅ SOLICITUD GENERAL (obligatoria en tu flujo)
    if (!solicitudGeneral) throw new Error("Debe enviar la solicitud general");
    validarLineasSolicitud(solicitudGeneral.lineas, "Solicitud General");

    // ✅ SOLICITUDES POR EQUIPO (opcional)
    if (solicitudesPorEquipo !== undefined && solicitudesPorEquipo !== null) {
      if (typeof solicitudesPorEquipo !== "object") {
        throw new Error("solicitudesPorEquipo debe ser un objeto");
      }

      for (const [key, sol] of Object.entries(solicitudesPorEquipo)) {
        if (!sol) continue;
        validarLineasSolicitud(sol.lineas, `Solicitud Target ${key}`);
      }
    }

    const r = await TratamientoController.guardarCambiosTratamiento({
      tratamientoId,
      body: req.body,
      usuarioId,
    });

    return res.json(r);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

module.exports = {
  crearTratamiento,
  obtenerTratamiento,
  guardarCambiosTratamientoHandler,
};
