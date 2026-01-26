const {
  Tratamiento,
  TratamientoTrabajador,
  Trabajador,
  Aviso,
  sequelize,
  SolicitudCompra,
  SolicitudCompraLinea,
} = require("../db_connection");

const { Op } = require("sequelize");

const crearTratamiento = async ({ avisoId, body, usuarioId }) => {
  const { tratamiento, solicitudCompra } = body;

  if (!tratamiento || !Array.isArray(tratamiento.requerimientos)) {
    throw new Error("Datos de tratamiento inválidos");
  }

  /* ===============================
     VALIDAR QUE NO EXISTA
  =============================== */
  const existe = await Tratamiento.findOne({
    where: { aviso_id: avisoId },
  });

  if (existe) {
    throw new Error("Este aviso ya tiene un tratamiento registrado");
  }

  /* ===============================
     1️⃣ CREAR TRATAMIENTO
  =============================== */
  const nuevoTratamiento = await Tratamiento.create({
    aviso_id: avisoId,
    contratista: tratamiento.contratista || null,
    requerimientos: tratamiento.requerimientos.map((r) => ({
      rol: r.rol,
      label: r.label,
      cantidad: r.cantidad,
    })),
    creado_por: usuarioId,
    estado: solicitudCompra ? "CON_SOLICITUD" : "CREADO",
  });

  /* ===============================
     2️⃣ ASIGNAR TRABAJADORES
  =============================== */
  for (const req of tratamiento.requerimientos) {
    const seleccionados = Array.isArray(req.personas)
      ? req.personas.map((p) => (typeof p === "string" ? p : p.id))
      : [];

    for (const trabajadorId of seleccionados) {
      await TratamientoTrabajador.create({
        tratamiento_id: nuevoTratamiento.id,
        trabajador_id: trabajadorId,
        rol: req.rol,
      });
    }

    const faltantes = req.cantidad - seleccionados.length;

    if (faltantes > 0) {
      const randoms = await Trabajador.findAll({
        where: {
          rol: req.rol,
          activo: true,
          ...(seleccionados.length && {
            id: { [Op.notIn]: seleccionados },
          }),
        },
        order: sequelize.random(),
        limit: faltantes,
      });

      await TratamientoTrabajador.bulkCreate(
        randoms.map((t) => ({
          tratamiento_id: nuevoTratamiento.id,
          trabajador_id: t.id,
          rol: req.rol,
        }))
      );
    }
  }

  /* ===============================
     3️⃣ CREAR SOLICITUD DE COMPRA
  =============================== */
  if (solicitudCompra) {
    const solicitud = await SolicitudCompra.create({
      tratamiento_id: nuevoTratamiento.id,
      docDate: new Date(),
      requiredDate: solicitudCompra.requiredDate,
      department: solicitudCompra.department,
      requester: solicitudCompra.email,
      comments: solicitudCompra.comments,
      usuario_id: usuarioId,
      estado: "DRAFT",
    });

    if (Array.isArray(solicitudCompra.lineas)) {
      await SolicitudCompraLinea.bulkCreate(
        solicitudCompra.lineas.map((l) => ({
          solicitud_compra_id: solicitud.id,
          itemCode: l.itemCode,
          description: l.description,
          quantity: l.quantity,
          costingCode: l.costCenter,
          projectCode: l.projectCode,
          warehouseCode: "01", // o el default que uses
        }))
      );
    }
  }

  /* ===============================
     4️⃣ CAMBIAR ESTADO DEL AVISO
  =============================== */
  await Aviso.update(
    { estadoAviso: "tratado" },
    { where: { id: avisoId } }
  );

  return nuevoTratamiento;
};

const obtenerTratamientoPorAviso = async (avisoId) => {
  return Tratamiento.findOne({
    where: { aviso_id: avisoId },
    include: [
      {
        model: TratamientoTrabajador,
        as: "trabajadores",
        include: [
          {
            model: Trabajador,
            as: "trabajador",
          },
        ],
      },
    ],
  });
};

module.exports = {
  crearTratamiento,
  obtenerTratamientoPorAviso,
};
