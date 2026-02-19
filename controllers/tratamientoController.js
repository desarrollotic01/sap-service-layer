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
  const t = await sequelize.transaction();

  try {
    const { tratamiento, solicitudCompra } = body;

    /* ===============================
       VALIDACIONES BASE (OBLIGATORIAS)
    =============================== */

    if (!tratamiento) {
      throw new Error("Datos de tratamiento requeridos");
    }

    if (!tratamiento.contratista) {
      throw new Error("El contratista es obligatorio");
    }

    if (
      !Array.isArray(tratamiento.requerimientos) ||
      tratamiento.requerimientos.length === 0
    ) {
      throw new Error("Debe agregar al menos un requerimiento");
    }

    for (const [i, req] of tratamiento.requerimientos.entries()) {
      if (!req.rol) {
        throw new Error(`Requerimiento ${i + 1}: rol obligatorio`);
      }

      if (!req.cantidad || req.cantidad <= 0) {
        throw new Error(
          `Requerimiento ${i + 1}: cantidad debe ser mayor a 0`
        );
      }
    }

    /* ===============================
       VALIDAR QUE NO EXISTA
    =============================== */
    const existe = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (existe) {
      throw new Error("Este aviso ya tiene un tratamiento registrado");
    }

    /* ===============================
       VALIDAR SOLICITUD (SI VIENE)
    =============================== */
    if (solicitudCompra) {
      if (!solicitudCompra.requiredDate) {
        throw new Error("Solicitud: requiredDate obligatorio");
      }

      if (!solicitudCompra.department) {
        throw new Error("Solicitud: department obligatorio");
      }

      if (!solicitudCompra.email) {
        throw new Error("Solicitud: email obligatorio");
      }

      if (
        !Array.isArray(solicitudCompra.lineas) ||
        solicitudCompra.lineas.length === 0
      ) {
        throw new Error("Solicitud: debe tener al menos una línea");
      }

      for (const [i, l] of solicitudCompra.lineas.entries()) {
        if (!l.itemCode) {
          throw new Error(`Línea ${i + 1}: itemCode obligatorio`);
        }

        if (!l.description) {
          throw new Error(`Línea ${i + 1}: description obligatorio`);
        }

        if (!l.quantity || l.quantity <= 0) {
          throw new Error(`Línea ${i + 1}: quantity inválida`);
        }
      }
    }

    /* ===============================
       1️⃣ CREAR TRATAMIENTO
    =============================== */
    const nuevoTratamiento = await Tratamiento.create(
      {
        aviso_id: avisoId,
        contratista: tratamiento.contratista,
        requerimientos: tratamiento.requerimientos.map((r) => ({
          rol: r.rol,
          label: r.label,
          cantidad: r.cantidad,
        })),
        creado_por: usuarioId,
        estado: solicitudCompra ? "CON_SOLICITUD" : "CREADO",
      },
      { transaction: t }
    );

    /* ===============================
       2️⃣ ASIGNAR TRABAJADORES
    =============================== */
    for (const req of tratamiento.requerimientos) {
      const seleccionados = Array.isArray(req.personas)
        ? req.personas.map((p) =>
            typeof p === "string" ? p : p.id
          )
        : [];

      // asignados manuales
      for (const trabajadorId of seleccionados) {
        await TratamientoTrabajador.create(
          {
            tratamiento_id: nuevoTratamiento.id,
            trabajador_id: trabajadorId,
            rol: req.rol,
          },
          { transaction: t }
        );
      }

      // completar faltantes
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
          transaction: t,
        });

        await TratamientoTrabajador.bulkCreate(
          randoms.map((trab) => ({
            tratamiento_id: nuevoTratamiento.id,
            trabajador_id: trab.id,
            rol: req.rol,
          })),
          { transaction: t }
        );
      }
    }

    /* ===============================
       3️⃣ CREAR SOLICITUD
    =============================== */
    if (solicitudCompra) {
      const solicitud = await SolicitudCompra.create(
        {
          tratamiento_id: nuevoTratamiento.id,
          docDate: new Date(),
          requiredDate: solicitudCompra.requiredDate,
          department: solicitudCompra.department,
          requester: solicitudCompra.email,
          comments: solicitudCompra.comments,
          usuario_id: usuarioId,
          estado: "DRAFT",
        },
        { transaction: t }
      );

      await SolicitudCompraLinea.bulkCreate(
        solicitudCompra.lineas.map((l) => ({
          solicitud_compra_id: solicitud.id,
          itemCode: l.itemCode,
          description: l.description,
          quantity: l.quantity,
          costingCode: l.costCenter,
          projectCode: l.projectCode,
          warehouseCode: "01",
        })),
        { transaction: t }
      );
    }

    /* ===============================
       4️⃣ ACTUALIZAR AVISO
    =============================== */
    await Aviso.update(
      { estadoAviso: "tratado" },
      { where: { id: avisoId }, transaction: t }
    );

    await t.commit();
    return nuevoTratamiento;
  } catch (error) {
    await t.rollback();
    throw error;
  }
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
      {
        model: SolicitudCompra,
        as: "solicitudCompra",
        include: [
          {
            model: SolicitudCompraLinea,
            as: "lineas",
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
