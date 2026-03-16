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
} = require("../db_connection");

const generarTokenSeguro = () => crypto.randomBytes(32).toString("hex");

/* =========================================================
   GENERAR LINK PORTAL CLIENTE
========================================================= */
const generarLinkPortalCliente = async ({
  clienteId,
  diasVigencia = 30,
  permanente = false,
}) => {
  const cliente = await Cliente.findByPk(clienteId);
  if (!cliente) throw new Error("Cliente no encontrado");

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

  const includeAdjuntosPortal = {
    model: Adjunto,
    as: "adjuntos",
    required: false,
    where: {
      mostrarEnPortal: true,
    },
    attributes: [
      "id",
      "nombre",
      "url",
      "extension",
      "categoria",
      "tituloPortal",
      "descripcionPortal",
      "ordenPortal",
      "createdAt",
      "updatedAt",
    ],
  };

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

  return {
    cliente: acceso.cliente,
    acceso: {
      id: acceso.id,
      activo: acceso.activo,
      expiraEn: acceso.expiraEn,
      ultimoUso: acceso.ultimoUso,
    },
    sedes,
    equiposSinSede,
    ubicacionesTecnicasSinSede,
  };
};

/* =========================================================
   LISTAR LINKS DE UN CLIENTE
========================================================= */
const listarLinksPortalPorCliente = async (clienteId) => {
  const cliente = await Cliente.findByPk(clienteId);
  if (!cliente) throw new Error("Cliente no encontrado");

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
  if (!link) throw new Error("Link no encontrado");

  await link.update({
    activo: false,
  });

  return {
    message: "Link desactivado correctamente",
    link,
  };
};

module.exports = {
  generarLinkPortalCliente,
  obtenerPortalClientePorToken,
  listarLinksPortalPorCliente,
  desactivarLinkPortalCliente,
};