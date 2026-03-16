const {
  Sede,
  Cliente,
  Equipo,
  Pais,
  Familia,
  Adjunto,
  UbicacionTecnica,
} = require("../db_connection");

/* =========================================================
   CREATE SEDE
========================================================= */
const CreateSede = async ({
  clienteId,
  nombre,
  direccion,
  telefono,
  contacto,
  correo,
  estado,
}) => {
  const nuevaSede = await Sede.create({
    clienteId,
    nombre: nombre.trim(),
    direccion: direccion ? direccion.trim() : null,
    telefono: telefono ? telefono.trim() : null,
    contacto: contacto ? contacto.trim() : null,
    correo: correo ? correo.trim().toLowerCase() : null,
    estado: estado || "Activo",
  });

  return await GetSedeById(nuevaSede.id);
};

/* =========================================================
   GET ALL SEDES
========================================================= */
const GetAllSedes = async () => {
  return await Sede.findAll({
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Equipo,
        as: "equipos",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Familia,
            as: "familia",
            attributes: ["id", "nombre"],
          },
          {
            model: Adjunto,
            as: "adjuntos",
            required: false,
          },
        ],
      },
      {
        model: UbicacionTecnica,
        as: "ubicacionesTecnicas",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

/* =========================================================
   GET SEDE BY ID
========================================================= */
const GetSedeById = async (id) => {
  return await Sede.findByPk(id, {
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Equipo,
        as: "equipos",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Familia,
            as: "familia",
            attributes: ["id", "nombre"],
          },
          {
            model: Adjunto,
            as: "adjuntos",
            required: false,
          },
        ],
      },
      {
        model: UbicacionTecnica,
        as: "ubicacionesTecnicas",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "razonSocial", "ruc"],
          },
        ],
      },
    ],
  });
};

/* =========================================================
   GET SEDES BY CLIENTE ID
========================================================= */
const GetSedesByClienteId = async (clienteId) => {
  return await Sede.findAll({
    where: { clienteId },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Equipo,
        as: "equipos",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Familia,
            as: "familia",
            attributes: ["id", "nombre"],
          },
          {
            model: Adjunto,
            as: "adjuntos",
            required: false,
          },
        ],
      },
      {
        model: UbicacionTecnica,
        as: "ubicacionesTecnicas",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "razonSocial", "ruc"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

/* =========================================================
   UPDATE SEDE
========================================================= */
const UpdateSede = async (id, data) => {
  const sede = await Sede.findByPk(id);
  if (!sede) return null;

  await sede.update({
    ...(data.clienteId !== undefined ? { clienteId: data.clienteId } : {}),
    ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
    ...(data.direccion !== undefined
      ? { direccion: data.direccion ? data.direccion.trim() : null }
      : {}),
    ...(data.telefono !== undefined
      ? { telefono: data.telefono ? data.telefono.trim() : null }
      : {}),
    ...(data.contacto !== undefined
      ? { contacto: data.contacto ? data.contacto.trim() : null }
      : {}),
    ...(data.correo !== undefined
      ? { correo: data.correo ? data.correo.trim().toLowerCase() : null }
      : {}),
    ...(data.estado !== undefined ? { estado: data.estado } : {}),
  });

  return await GetSedeById(id);
};

/* =========================================================
   DELETE SEDE (LÓGICO)
========================================================= */
const DeleteSede = async (id) => {
  const sede = await Sede.findByPk(id);
  if (!sede) return null;

  await sede.update({
    estado: "Inactivo",
  });

  return sede;
};

/* =========================================================
   ASIGNAR EQUIPOS A SEDE
========================================================= */
const AsignarEquiposASede = async (sedeId, equipoIds = []) => {
  const sede = await Sede.findByPk(sedeId);
  if (!sede) return null;

  await Equipo.update(
    { sedeId },
    {
      where: {
        id: equipoIds,
        clienteId: sede.clienteId,
      },
    }
  );

  return await GetSedeById(sedeId);
};

/* =========================================================
   QUITAR EQUIPO DE SEDE
========================================================= */
const QuitarEquipoDeSede = async (sedeId, equipoId) => {
  const sede = await Sede.findByPk(sedeId);
  if (!sede) return null;

  const equipo = await Equipo.findOne({
    where: {
      id: equipoId,
      sedeId,
      clienteId: sede.clienteId,
    },
  });

  if (!equipo) return null;

  await equipo.update({
    sedeId: null,
  });

  return equipo;
};

/* =========================================================
   GET EQUIPOS POR SEDE
========================================================= */
const GetEquiposPorSede = async (sedeId) => {
  const sede = await Sede.findByPk(sedeId, {
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Equipo,
        as: "equipos",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Familia,
            as: "familia",
            attributes: ["id", "nombre"],
          },
          {
            model: Adjunto,
            as: "adjuntos",
            required: false,
          },
        ],
      },
    ],
  });

  return sede;
};

/* =========================================================
   ASIGNAR UBICACIONES TECNICAS A SEDE
========================================================= */
const AsignarUbicacionesTecnicasASede = async (sedeId, ubicacionIds = []) => {
  const sede = await Sede.findByPk(sedeId);
  if (!sede) return null;

  await UbicacionTecnica.update(
    { sedeId },
    {
      where: {
        id: ubicacionIds,
        clienteId: sede.clienteId,
      },
    }
  );

  return await GetSedeById(sedeId);
};

/* =========================================================
   QUITAR UBICACION TECNICA DE SEDE
========================================================= */
const QuitarUbicacionTecnicaDeSede = async (sedeId, ubicacionId) => {
  const sede = await Sede.findByPk(sedeId);
  if (!sede) return null;

  const ubicacion = await UbicacionTecnica.findOne({
    where: {
      id: ubicacionId,
      sedeId,
      clienteId: sede.clienteId,
    },
  });

  if (!ubicacion) return null;

  await ubicacion.update({
    sedeId: null,
  });

  return ubicacion;
};

/* =========================================================
   GET UBICACIONES TECNICAS POR SEDE
========================================================= */
const GetUbicacionesTecnicasPorSede = async (sedeId) => {
  const sede = await Sede.findByPk(sedeId, {
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: UbicacionTecnica,
        as: "ubicacionesTecnicas",
        required: false,
        include: [
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "razonSocial", "ruc"],
          },
        ],
      },
    ],
  });

  return sede;
};

module.exports = {
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
};