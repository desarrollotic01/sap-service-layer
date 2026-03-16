const { validate: isUUID } = require("uuid");
const { Cliente, Sede, Equipo, UbicacionTecnica } = require("../db_connection");
const {
  CreateSede,
  GetAllSedes,
  GetSedeById,
  GetSedesByClienteId,
  UpdateSede,
  DeleteSede,
  AsignarEquiposASede,
  QuitarEquipoDeSede,
  GetEquiposPorSede,
  AsignarUbicacionesTecnicasASede,
  QuitarUbicacionTecnicaDeSede,
  GetUbicacionesTecnicasPorSede,
} = require("../controllers/sedeController");

/* =========================================================
   HELPERS
========================================================= */
const esTextoValido = (valor) =>
  typeof valor === "string" && valor.trim().length > 0;

const esCorreoValido = (correo) => {
  if (correo === null || correo === undefined || correo === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim());
};

const esEstadoValido = (estado) => ["Activo", "Inactivo"].includes(estado);

/* =========================================================
   CREATE SEDE HANDLER
========================================================= */
const CreateSedeHandler = async (req, res) => {
  try {
    const {
      clienteId,
      nombre,
      direccion,
      telefono,
      contacto,
      correo,
      estado,
    } = req.body;

    if (!clienteId) {
      return res.status(400).json({ error: "El campo clienteId es obligatorio" });
    }

    if (!isUUID(clienteId)) {
      return res.status(400).json({ error: "clienteId debe ser un UUID válido" });
    }

    if (!esTextoValido(nombre)) {
      return res.status(400).json({
        error: "El campo nombre es obligatorio y debe ser un texto válido",
      });
    }

    if (nombre.trim().length > 150) {
      return res.status(400).json({
        error: "El campo nombre no puede exceder los 150 caracteres",
      });
    }

    if (direccion !== undefined && direccion !== null) {
      if (typeof direccion !== "string") {
        return res.status(400).json({ error: "El campo direccion debe ser texto" });
      }

      if (direccion.trim().length > 255) {
        return res.status(400).json({
          error: "El campo direccion no puede exceder los 255 caracteres",
        });
      }
    }

    if (telefono !== undefined && telefono !== null) {
      if (typeof telefono !== "string") {
        return res.status(400).json({ error: "El campo telefono debe ser texto" });
      }

      if (telefono.trim().length > 30) {
        return res.status(400).json({
          error: "El campo telefono no puede exceder los 30 caracteres",
        });
      }
    }

    if (contacto !== undefined && contacto !== null) {
      if (typeof contacto !== "string") {
        return res.status(400).json({ error: "El campo contacto debe ser texto" });
      }

      if (contacto.trim().length > 120) {
        return res.status(400).json({
          error: "El campo contacto no puede exceder los 120 caracteres",
        });
      }
    }

    if (!esCorreoValido(correo)) {
      return res.status(400).json({
        error: "El campo correo no tiene un formato válido",
      });
    }

    if (correo && String(correo).trim().length > 150) {
      return res.status(400).json({
        error: "El campo correo no puede exceder los 150 caracteres",
      });
    }

    if (estado !== undefined && !esEstadoValido(estado)) {
      return res.status(400).json({
        error: "El campo estado solo puede ser 'Activo' o 'Inactivo'",
      });
    }

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: "El cliente indicado no existe" });
    }

    const sedeExistente = await Sede.findOne({
      where: {
        clienteId,
        nombre: nombre.trim(),
      },
    });

    if (sedeExistente) {
      return res.status(400).json({
        error: "Ya existe una sede con ese nombre para este cliente",
      });
    }

    const nuevaSede = await CreateSede({
      clienteId,
      nombre,
      direccion,
      telefono,
      contacto,
      correo,
      estado,
    });

    return res.status(201).json({
      message: "Sede creada correctamente",
      data: nuevaSede,
    });
  } catch (error) {
    console.error("Error en CreateSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al crear la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   GET ALL SEDES HANDLER
========================================================= */
const GetAllSedesHandler = async (req, res) => {
  try {
    const sedes = await GetAllSedes();

    return res.status(200).json({
      message: "Sedes obtenidas correctamente",
      data: sedes,
    });
  } catch (error) {
    console.error("Error en GetAllSedesHandler:", error);
    return res.status(500).json({
      error: "Error interno al obtener las sedes",
      detalle: error.message,
    });
  }
};

/* =========================================================
   GET SEDE BY ID HANDLER
========================================================= */
const GetSedeByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "El id es obligatorio" });
    }

    if (!isUUID(id)) {
      return res.status(400).json({ error: "El id debe ser un UUID válido" });
    }

    const sede = await GetSedeById(id);

    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    return res.status(200).json({
      message: "Sede obtenida correctamente",
      data: sede,
    });
  } catch (error) {
    console.error("Error en GetSedeByIdHandler:", error);
    return res.status(500).json({
      error: "Error interno al obtener la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   GET SEDES BY CLIENTE ID HANDLER
========================================================= */
const GetSedesByClienteIdHandler = async (req, res) => {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      return res.status(400).json({ error: "clienteId es obligatorio" });
    }

    if (!isUUID(clienteId)) {
      return res.status(400).json({
        error: "clienteId debe ser un UUID válido",
      });
    }

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const sedes = await GetSedesByClienteId(clienteId);

    return res.status(200).json({
      message: "Sedes del cliente obtenidas correctamente",
      data: sedes,
    });
  } catch (error) {
    console.error("Error en GetSedesByClienteIdHandler:", error);
    return res.status(500).json({
      error: "Error interno al obtener las sedes del cliente",
      detalle: error.message,
    });
  }
};

/* =========================================================
   UPDATE SEDE HANDLER
========================================================= */
const UpdateSedeHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clienteId,
      nombre,
      direccion,
      telefono,
      contacto,
      correo,
      estado,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "El id es obligatorio" });
    }

    if (!isUUID(id)) {
      return res.status(400).json({ error: "El id debe ser un UUID válido" });
    }

    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    if (clienteId !== undefined) {
      if (!clienteId) {
        return res.status(400).json({ error: "clienteId no puede estar vacío" });
      }

      if (!isUUID(clienteId)) {
        return res.status(400).json({
          error: "clienteId debe ser un UUID válido",
        });
      }

      const cliente = await Cliente.findByPk(clienteId);
      if (!cliente) {
        return res.status(404).json({ error: "El cliente indicado no existe" });
      }
    }

    if (nombre !== undefined) {
      if (!esTextoValido(nombre)) {
        return res.status(400).json({
          error: "El campo nombre debe ser un texto válido",
        });
      }

      if (nombre.trim().length > 150) {
        return res.status(400).json({
          error: "El campo nombre no puede exceder los 150 caracteres",
        });
      }
    }

    if (direccion !== undefined && direccion !== null) {
      if (typeof direccion !== "string") {
        return res.status(400).json({ error: "El campo direccion debe ser texto" });
      }

      if (direccion.trim().length > 255) {
        return res.status(400).json({
          error: "El campo direccion no puede exceder los 255 caracteres",
        });
      }
    }

    if (telefono !== undefined && telefono !== null) {
      if (typeof telefono !== "string") {
        return res.status(400).json({ error: "El campo telefono debe ser texto" });
      }

      if (telefono.trim().length > 30) {
        return res.status(400).json({
          error: "El campo telefono no puede exceder los 30 caracteres",
        });
      }
    }

    if (contacto !== undefined && contacto !== null) {
      if (typeof contacto !== "string") {
        return res.status(400).json({ error: "El campo contacto debe ser texto" });
      }

      if (contacto.trim().length > 120) {
        return res.status(400).json({
          error: "El campo contacto no puede exceder los 120 caracteres",
        });
      }
    }

    if (correo !== undefined && !esCorreoValido(correo)) {
      return res.status(400).json({
        error: "El campo correo no tiene un formato válido",
      });
    }

    if (correo && String(correo).trim().length > 150) {
      return res.status(400).json({
        error: "El campo correo no puede exceder los 150 caracteres",
      });
    }

    if (estado !== undefined && !esEstadoValido(estado)) {
      return res.status(400).json({
        error: "El campo estado solo puede ser 'Activo' o 'Inactivo'",
      });
    }

    const nombreFinal = nombre !== undefined ? nombre.trim() : sede.nombre;
    const clienteFinal = clienteId !== undefined ? clienteId : sede.clienteId;

    const sedeDuplicada = await Sede.findOne({
      where: {
        clienteId: clienteFinal,
        nombre: nombreFinal,
      },
    });

    if (sedeDuplicada && sedeDuplicada.id !== id) {
      return res.status(400).json({
        error: "Ya existe otra sede con ese nombre para este cliente",
      });
    }

    const sedeActualizada = await UpdateSede(id, {
      clienteId,
      nombre,
      direccion,
      telefono,
      contacto,
      correo,
      estado,
    });

    return res.status(200).json({
      message: "Sede actualizada correctamente",
      data: sedeActualizada,
    });
  } catch (error) {
    console.error("Error en UpdateSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al actualizar la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   DELETE SEDE HANDLER
========================================================= */
const DeleteSedeHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "El id es obligatorio" });
    }

    if (!isUUID(id)) {
      return res.status(400).json({ error: "El id debe ser un UUID válido" });
    }

    const sedeEliminada = await DeleteSede(id);

    if (!sedeEliminada) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    return res.status(200).json({
      message: "Sede desactivada correctamente",
      data: sedeEliminada,
    });
  } catch (error) {
    console.error("Error en DeleteSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al desactivar la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   ASIGNAR EQUIPOS A SEDE HANDLER
========================================================= */
const AsignarEquiposASedeHandler = async (req, res) => {
  try {
    const { sedeId } = req.params;
    const { equipoIds } = req.body;

    if (!sedeId) {
      return res.status(400).json({ error: "sedeId es obligatorio" });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({ error: "sedeId debe ser un UUID válido" });
    }

    if (!Array.isArray(equipoIds)) {
      return res.status(400).json({
        error: "equipoIds debe ser un arreglo",
      });
    }

    if (equipoIds.length === 0) {
      return res.status(400).json({
        error: "Debes enviar al menos un equipo para asignar",
      });
    }

    const idsUnicos = [...new Set(equipoIds)];

    for (const equipoId of idsUnicos) {
      if (!isUUID(equipoId)) {
        return res.status(400).json({
          error: `El equipoId ${equipoId} no es un UUID válido`,
        });
      }
    }

    const sede = await Sede.findByPk(sedeId);
    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    const equipos = await Equipo.findAll({
      where: {
        id: idsUnicos,
      },
    });

    if (equipos.length !== idsUnicos.length) {
      return res.status(404).json({
        error: "Uno o más equipos no existen",
      });
    }

    const sedeActualizada = await AsignarEquiposASede(sedeId, idsUnicos);

    return res.status(200).json({
      message: "Equipos asignados correctamente a la sede",
      data: sedeActualizada,
    });
  } catch (error) {
    console.error("Error en AsignarEquiposASedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al asignar equipos a la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   QUITAR EQUIPO DE SEDE HANDLER
========================================================= */
const QuitarEquipoDeSedeHandler = async (req, res) => {
  try {
    const { sedeId, equipoId } = req.params;

    if (!sedeId || !equipoId) {
      return res.status(400).json({
        error: "sedeId y equipoId son obligatorios",
      });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({
        error: "sedeId debe ser un UUID válido",
      });
    }

    if (!isUUID(equipoId)) {
      return res.status(400).json({
        error: "equipoId debe ser un UUID válido",
      });
    }

    const sede = await Sede.findByPk(sedeId);
    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    const equipo = await Equipo.findByPk(equipoId);
    if (!equipo) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    if (equipo.clienteId !== sede.clienteId) {
      return res.status(400).json({
        error: "El equipo no pertenece al mismo cliente de la sede",
      });
    }

    if (equipo.sedeId !== sedeId) {
      return res.status(400).json({
        error: "El equipo no está asignado a esta sede",
      });
    }

    const equipoActualizado = await QuitarEquipoDeSede(sedeId, equipoId);

    if (!equipoActualizado) {
      return res.status(404).json({
        error: "No se pudo quitar el equipo de la sede",
      });
    }

    return res.status(200).json({
      message: "Equipo quitado de la sede correctamente",
      data: equipoActualizado,
    });
  } catch (error) {
    console.error("Error en QuitarEquipoDeSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al quitar el equipo de la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   GET EQUIPOS POR SEDE HANDLER
========================================================= */
const GetEquiposPorSedeHandler = async (req, res) => {
  try {
    const { sedeId } = req.params;

    if (!sedeId) {
      return res.status(400).json({ error: "sedeId es obligatorio" });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({
        error: "sedeId debe ser un UUID válido",
      });
    }

    const sede = await GetEquiposPorSede(sedeId);

    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    return res.status(200).json({
      message: "Equipos de la sede obtenidos correctamente",
      data: sede,
    });
  } catch (error) {
    console.error("Error en GetEquiposPorSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al obtener los equipos de la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   ASIGNAR UBICACIONES TECNICAS A SEDE HANDLER
========================================================= */
const AsignarUbicacionesTecnicasASedeHandler = async (req, res) => {
  try {
    const { sedeId } = req.params;
    const { ubicacionIds } = req.body;

    if (!sedeId) {
      return res.status(400).json({ error: "sedeId es obligatorio" });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({ error: "sedeId debe ser un UUID válido" });
    }

    if (!Array.isArray(ubicacionIds)) {
      return res.status(400).json({
        error: "ubicacionIds debe ser un arreglo",
      });
    }

    if (ubicacionIds.length === 0) {
      return res.status(400).json({
        error: "Debes enviar al menos una ubicación técnica para asignar",
      });
    }

    const idsUnicos = [...new Set(ubicacionIds)];

    for (const ubicacionId of idsUnicos) {
      if (!isUUID(ubicacionId)) {
        return res.status(400).json({
          error: `El ubicacionId ${ubicacionId} no es un UUID válido`,
        });
      }
    }

    const sede = await Sede.findByPk(sedeId);
    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    const ubicaciones = await UbicacionTecnica.findAll({
      where: {
        id: idsUnicos,
      },
    });

    if (ubicaciones.length !== idsUnicos.length) {
      return res.status(404).json({
        error: "Una o más ubicaciones técnicas no existen",
      });
    }

    const ubicacionesDeOtroCliente = ubicaciones.filter(
      (ubicacion) => ubicacion.clienteId !== sede.clienteId
    );

    if (ubicacionesDeOtroCliente.length > 0) {
      return res.status(400).json({
        error: "Solo puedes asignar ubicaciones técnicas del mismo cliente de la sede",
      });
    }

    const sedeActualizada = await AsignarUbicacionesTecnicasASede(
      sedeId,
      idsUnicos
    );

    return res.status(200).json({
      message: "Ubicaciones técnicas asignadas correctamente a la sede",
      data: sedeActualizada,
    });
  } catch (error) {
    console.error("Error en AsignarUbicacionesTecnicasASedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al asignar ubicaciones técnicas a la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   QUITAR UBICACION TECNICA DE SEDE HANDLER
========================================================= */
const QuitarUbicacionTecnicaDeSedeHandler = async (req, res) => {
  try {
    const { sedeId, ubicacionId } = req.params;

    if (!sedeId || !ubicacionId) {
      return res.status(400).json({
        error: "sedeId y ubicacionId son obligatorios",
      });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({
        error: "sedeId debe ser un UUID válido",
      });
    }

    if (!isUUID(ubicacionId)) {
      return res.status(400).json({
        error: "ubicacionId debe ser un UUID válido",
      });
    }

    const sede = await Sede.findByPk(sedeId);
    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    const ubicacion = await UbicacionTecnica.findByPk(ubicacionId);
    if (!ubicacion) {
      return res.status(404).json({ error: "Ubicación técnica no encontrada" });
    }

    if (ubicacion.sedeId !== sedeId) {
      return res.status(400).json({
        error: "La ubicación técnica no está asignada a esta sede",
      });
    }

    const ubicacionActualizada = await QuitarUbicacionTecnicaDeSede(
      sedeId,
      ubicacionId
    );

    if (!ubicacionActualizada) {
      return res.status(404).json({
        error: "No se pudo quitar la ubicación técnica de la sede",
      });
    }

    return res.status(200).json({
      message: "Ubicación técnica quitada de la sede correctamente",
      data: ubicacionActualizada,
    });
  } catch (error) {
    console.error("Error en QuitarUbicacionTecnicaDeSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al quitar la ubicación técnica de la sede",
      detalle: error.message,
    });
  }
};

/* =========================================================
   GET UBICACIONES TECNICAS POR SEDE HANDLER
========================================================= */
const GetUbicacionesTecnicasPorSedeHandler = async (req, res) => {
  try {
    const { sedeId } = req.params;

    if (!sedeId) {
      return res.status(400).json({ error: "sedeId es obligatorio" });
    }

    if (!isUUID(sedeId)) {
      return res.status(400).json({
        error: "sedeId debe ser un UUID válido",
      });
    }

    const sede = await GetUbicacionesTecnicasPorSede(sedeId);

    if (!sede) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }

    return res.status(200).json({
      message: "Ubicaciones técnicas de la sede obtenidas correctamente",
      data: sede,
    });
  } catch (error) {
    console.error("Error en GetUbicacionesTecnicasPorSedeHandler:", error);
    return res.status(500).json({
      error: "Error interno al obtener las ubicaciones técnicas de la sede",
      detalle: error.message,
    });
  }
};

module.exports = {
  CreateSedeHandler,
  GetAllSedesHandler,
  GetSedeByIdHandler,
  GetSedesByClienteIdHandler,
  UpdateSedeHandler,
  DeleteSedeHandler,
  AsignarEquiposASedeHandler,
  QuitarEquipoDeSedeHandler,
  GetEquiposPorSedeHandler,
  AsignarUbicacionesTecnicasASedeHandler,
  QuitarUbicacionTecnicaDeSedeHandler,
  GetUbicacionesTecnicasPorSedeHandler,
};