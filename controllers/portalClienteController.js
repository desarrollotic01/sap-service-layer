const crypto = require("crypto");
const { Op } = require("sequelize");

const {
  Cliente,
  PortalClienteToken,
  Equipo,
  Pais,
  Familia,
  Adjunto,
  UbicacionTecnica,
  Sede,
  Notificacion,
  OrdenTrabajoEquipo,
  OrdenTrabajo,
  Aviso,
} = require("../db_connection");

const { getNotificacionForPdfDB } = require("./notificacionController");
const { renderNotificacionPdfBuffer } = require("../services/notificacionPdfService");

const generarTokenSeguro = () => crypto.randomBytes(32).toString("hex");

/* =========================================================
   INCLUDE REUTILIZABLE DE ADJUNTOS PORTAL
========================================================= */
const includeAdjuntosPortal = {
  model: Adjunto,
  as: "adjuntos",
  required: false,
  where: {
    notificacionId: null,
    ordenTrabajoId: null,
    ordenTrabajoEquipoId: null,
  },
  attributes: [
    "id",
    "nombre",
    "url",
    "extension",
    "categoria",
    "mostrarEnPortal",
    "tituloPortal",
    "descripcionPortal",
    "ordenPortal",
    "createdAt",
    "updatedAt",
  ],
};

/* =========================================================
   GENERAR LINK PORTAL CLIENTE
========================================================= */
const generarLinkPortalCliente = async ({
  clienteId,
  diasVigencia = 30,
  permanente = false,
}) => {
  const cliente = await Cliente.findByPk(clienteId);

  if (!cliente) {
    throw new Error("Cliente no encontrado");
  }

  const token = generarTokenSeguro();

  let expiraEn = null;

  if (!permanente) {
    expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + Number(diasVigencia || 30));
  }

  const access = await PortalClienteToken.create({
    clienteId,
    token,
    activo: true,
    expiraEn,
  });

  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  return {
    id: access.id,
    clienteId,
    token,
    activo: access.activo,
    expiraEn: access.expiraEn,
    ultimoUso: access.ultimoUso,
    createdAt: access.createdAt,
    updatedAt: access.updatedAt,
    link: `${baseUrl}/portal/cliente/${token}`,
  };
};

/* =========================================================
   OBTENER PORTAL CLIENTE POR TOKEN
========================================================= */
const obtenerPortalClientePorToken = async (token) => {
  const acceso = await PortalClienteToken.findOne({
    where: {
      token,
      activo: true,
      [Op.or]: [
        { expiraEn: null },
        { expiraEn: { [Op.gt]: new Date() } },
      ],
    },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: [
          "id",
          "razonSocial",
          "ruc",
          "direccion",
          "telefono",
          "correo",
          "tipoCliente",
        ],
      },
    ],
  });

  if (!acceso) {
    throw new Error("Link inválido o expirado");
  }

  await acceso.update({
    ultimoUso: new Date(),
  });

  const sedes = await Sede.findAll({
    where: {
      clienteId: acceso.clienteId,
      estado: "Activo",
    },
    include: [
      {
        model: Equipo,
        as: "equipos",
        required: false,
        include: [
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "razonSocial", "ruc"],
          },
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
          includeAdjuntosPortal,
        ],
      },
      {
        model: UbicacionTecnica,
        as: "ubicacionesTecnicas",
        required: false,
        include: [
          {
            model: Cliente,
            as: "cliente",
            attributes: ["id", "razonSocial", "ruc"],
          },
          {
            model: Pais,
            as: "pais",
            attributes: ["id", "codigo", "nombre"],
          },
        ],
      },
    ],
    order: [
      ["createdAt", "DESC"],
      [{ model: Equipo, as: "equipos" }, "createdAt", "DESC"],
      [{ model: Equipo, as: "equipos" }, { model: Adjunto, as: "adjuntos" }, "ordenPortal", "ASC"],
      [{ model: UbicacionTecnica, as: "ubicacionesTecnicas" }, "createdAt", "DESC"],
    ],
  });

  const equiposSinSede = await Equipo.findAll({
    where: {
      clienteId: acceso.clienteId,
      sedeId: null,
    },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
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
      includeAdjuntosPortal,
    ],
    order: [
      ["createdAt", "DESC"],
      [{ model: Adjunto, as: "adjuntos" }, "ordenPortal", "ASC"],
    ],
  });

  const ubicacionesTecnicasSinSede = await UbicacionTecnica.findAll({
    where: {
      clienteId: acceso.clienteId,
      sedeId: null,
    },
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
      {
        model: Pais,
        as: "pais",
        attributes: ["id", "codigo", "nombre"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Collect all equipo IDs to batch-fetch historial
  const allEquipoIds = [];
  for (const sede of sedes) {
    for (const equipo of sede.equipos || []) {
      allEquipoIds.push(equipo.id);
    }
  }
  for (const equipo of equiposSinSede) {
    allEquipoIds.push(equipo.id);
  }

  const historialPorEquipo = {};
  if (allEquipoIds.length > 0) {
    const notificaciones = await Notificacion.findAll({
      include: [
        {
          model: OrdenTrabajoEquipo,
          as: "equipoOT",
          where: { equipoId: { [Op.in]: allEquipoIds } },
          required: true,
          attributes: ["id", "equipoId"],
        },
        {
          model: OrdenTrabajo,
          as: "ordenTrabajo",
          required: true,
          attributes: ["id", "numeroOT"],
          include: [
            {
              model: Aviso,
              as: "aviso",
              required: true,
              where: { tipoAviso: "mantenimiento" },
              attributes: ["tipoAviso"],
            },
          ],
        },
      ],
      attributes: ["id", "fechaFin", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    for (const notif of notificaciones) {
      const equipoId = notif.equipoOT?.equipoId;
      if (!equipoId) continue;
      if (!historialPorEquipo[equipoId]) historialPorEquipo[equipoId] = [];
      historialPorEquipo[equipoId].push({
        id: notif.id,
        fechaFin: notif.fechaFin,
        createdAt: notif.createdAt,
        numeroOT: notif.ordenTrabajo?.numeroOT || null,
        tipoAviso: notif.ordenTrabajo?.aviso?.tipoAviso || null,
      });
    }
  }

  const addHistorial = (equipo) => ({
    ...equipo,
    historialCierres: historialPorEquipo[equipo.id] || [],
  });

  const sedesJSON = sedes.map((sede) => {
    const sj = sede.toJSON();
    sj.equipos = (sj.equipos || []).map(addHistorial);
    return sj;
  });

  const equiposSinSedeJSON = equiposSinSede.map((e) => addHistorial(e.toJSON()));

  return {
    cliente: acceso.cliente,
    acceso: {
      id: acceso.id,
      activo: acceso.activo,
      expiraEn: acceso.expiraEn,
      ultimoUso: acceso.ultimoUso,
      createdAt: acceso.createdAt,
      updatedAt: acceso.updatedAt,
    },
    sedes: sedesJSON,
    equiposSinSede: equiposSinSedeJSON,
    ubicacionesTecnicasSinSede,
  };
};

/* =========================================================
   LISTAR LINKS DE UN CLIENTE
========================================================= */
const listarLinksPortalPorCliente = async (clienteId) => {
  const cliente = await Cliente.findByPk(clienteId);

  if (!cliente) {
    throw new Error("Cliente no encontrado");
  }

  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const links = await PortalClienteToken.findAll({
    where: {
      clienteId,
    },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Cliente,
        as: "cliente",
        attributes: ["id", "razonSocial", "ruc"],
      },
    ],
  });

  return links.map((link) => ({
    id: link.id,
    clienteId: link.clienteId,
    token: link.token,
    activo: link.activo,
    expiraEn: link.expiraEn,
    ultimoUso: link.ultimoUso,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    cliente: link.cliente,
    link: `${baseUrl}/portal/cliente/${link.token}`,
  }));
};

/* =========================================================
   DESACTIVAR LINK
========================================================= */
const desactivarLinkPortalCliente = async (id) => {
  const link = await PortalClienteToken.findByPk(id);

  if (!link) {
    throw new Error("Link no encontrado");
  }

  await link.update({
    activo: false,
  });

  return {
    id: link.id,
    clienteId: link.clienteId,
    token: link.token,
    activo: link.activo,
    expiraEn: link.expiraEn,
    ultimoUso: link.ultimoUso,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    message: "Link desactivado correctamente",
  };
};

/* =========================================================
   OBTENER PDF NOTIFICACION PARA PORTAL (autenticado por token)
========================================================= */
const obtenerNotificacionPdfPortal = async (token, notificacionId) => {
  const acceso = await PortalClienteToken.findOne({
    where: {
      token,
      activo: true,
      [Op.or]: [
        { expiraEn: null },
        { expiraEn: { [Op.gt]: new Date() } },
      ],
    },
  });

  if (!acceso) throw new Error("Link inválido o expirado");

  const notifCheck = await Notificacion.findByPk(notificacionId, {
    include: [
      {
        model: OrdenTrabajoEquipo,
        as: "equipoOT",
        required: true,
        attributes: ["id", "equipoId"],
        include: [
          {
            model: Equipo,
            as: "equipo",
            where: { clienteId: acceso.clienteId },
            required: true,
            attributes: ["id"],
          },
        ],
      },
    ],
    attributes: ["id"],
  });

  if (!notifCheck) throw new Error("Notificación no encontrada o sin acceso");

  const fullNotif = await getNotificacionForPdfDB(notificacionId);
  return await renderNotificacionPdfBuffer(fullNotif);
};

module.exports = {
  generarLinkPortalCliente,
  obtenerPortalClientePorToken,
  listarLinksPortalPorCliente,
  desactivarLinkPortalCliente,
  obtenerNotificacionPdfPortal,
};