const {
  Tratamiento,
  Aviso,
  sequelize,
  SolicitudCompra,
  SolicitudCompraLinea,
  SolicitudAlmacen,
  SolicitudAlmacenLinea,
  TratamientoEquipo,
  TratamientoEquipoActividad,
  PlanMantenimiento,
  PlanMantenimientoActividad,
  Equipo,
  UbicacionTecnica,
} = require("../db_connection");
const { Op } = require("sequelize");

const TIPOS_TRABAJO_CORRECTIVO = ["REPARACION", "CAMBIO"];

const TIPOS_TRABAJO_PREVENTIVO = [
  "APLICACION",
  "REVISION",
  "INSPECCION",
  "CAMBIO",
  "LIMPIEZA",
  "AJUSTE",
  "LUBRICACION",
  "REPARACION",
];

const toMinutes = (valor, unidad) => {
  if (valor === null || valor === undefined) return null;
  const v = Number(valor);
  if (Number.isNaN(v)) return null;
  return unidad === "h" ? Math.round(v * 60) : Math.round(v);
};

const toNullableString = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const normalizarCantidadTecnicos = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const normalizarDuracionActividad = (act) => {
  const unidad = act?.unidadDuracion || "min";

  const valor =
    act?.duracionEstimadaValor !== undefined &&
    act?.duracionEstimadaValor !== null
      ? Number(act.duracionEstimadaValor)
      : null;

  const min =
    act?.duracionEstimadaMin !== undefined &&
    act?.duracionEstimadaMin !== null
      ? Number(act.duracionEstimadaMin)
      : toMinutes(valor, unidad);

  return {
    unidadDuracion: unidad,
    duracionEstimadaValor: Number.isFinite(valor) ? valor : null,
    duracionEstimadaMin: Number.isFinite(min) ? min : null,
  };
};

/* ===============================
   HELPERS NUMERO SOLICITUD
=============================== */
const limpiarOV = (valor) => {
  if (valor === undefined || valor === null) return null;
  const ov = String(valor).trim();
  return ov || null;
};

const obtenerOrdenVentaParaTarget = async ({
  aviso,
  equipoId = null,
  ubicacionId = null,
  transaction,
}) => {
  if (equipoId) {
    const equipo = await Equipo.findByPk(equipoId, { transaction });

    if (!equipo) {
      throw new Error("No se encontró el equipo para generar la solicitud");
    }

    const ov = limpiarOV(
      equipo.numeroOV || equipo.ordenVenta || equipo.ov || aviso?.numeroOV || aviso?.ordenVenta
    );

    if (!ov) {
      throw new Error(`El equipo ${equipoId} no tiene número de OV asociado`);
    }

    return ov;
  }

  if (ubicacionId) {
    const ubicacion = await UbicacionTecnica.findByPk(ubicacionId, { transaction });

    if (!ubicacion) {
      throw new Error("No se encontró la ubicación técnica para generar la solicitud");
    }

    const ov = limpiarOV(
      ubicacion.numeroOV ||
        ubicacion.ordenVenta ||
        ubicacion.ov ||
        aviso?.numeroOV ||
        aviso?.ordenVenta
    );

    if (!ov) {
      throw new Error(`La ubicación técnica ${ubicacionId} no tiene número de OV asociado`);
    }

    return ov;
  }

  const ovGeneral = limpiarOV(aviso?.numeroOV || aviso?.ordenVenta);

  if (!ovGeneral) {
    throw new Error("El aviso no tiene número de OV para generar la solicitud general");
  }

  return ovGeneral;
};

const generarNumeroSolicitud = async ({
  modelo,
  prefijo,
  ordenVenta,
  transaction,
}) => {
  const total = await modelo.count({
    where: {
      numeroSolicitud: {
        [Op.like]: `${prefijo}-${ordenVenta}-%`,
      },
    },
    transaction,
  });

  const correlativo = String(total + 1).padStart(3, "0");
  return `${prefijo}-${ordenVenta}-${correlativo}`;
};

/* ===============================
   HELPERS SOLICITUD OPCIONAL
=============================== */
const esSolicitudVacia = (solicitud) => {
  if (!solicitud || typeof solicitud !== "object") return true;

  const requiredDateVacio =
    !solicitud.requiredDate || !String(solicitud.requiredDate).trim();

  const emailVacio = !solicitud.email || !String(solicitud.email).trim();

  const requesterVacio =
    !solicitud.requester || !String(solicitud.requester).trim();

  const lineasVacias =
    !Array.isArray(solicitud.lineas) || solicitud.lineas.length === 0;

  return requiredDateVacio && emailVacio && requesterVacio && lineasVacias;
};

const normalizarSolicitudOpcional = (solicitud) => {
  return esSolicitudVacia(solicitud) ? null : solicitud;
};

const normalizarSolicitudesPorTarget = (obj = {}) => {
  const resultado = {};

  if (!obj || typeof obj !== "object") return resultado;

  for (const key of Object.keys(obj)) {
    const solicitudNormalizada = normalizarSolicitudOpcional(obj[key]);
    if (solicitudNormalizada) {
      resultado[key] = solicitudNormalizada;
    }
  }

  return resultado;
};

/* ===============================
   HELPERS VALIDACION SOLICITUDES
=============================== */
const validarSolicitud = (solicitud, nombre) => {
  if (!solicitud) return;

  if (!solicitud.requiredDate || !String(solicitud.requiredDate).trim()) {
    throw new Error(`${nombre}: requiredDate es obligatorio`);
  }

  if (
    (!solicitud.requester || !String(solicitud.requester).trim()) &&
    (!solicitud.email || !String(solicitud.email).trim())
  ) {
    throw new Error(`${nombre}: requester o email es obligatorio`);
  }

  if (!Array.isArray(solicitud.lineas) || solicitud.lineas.length === 0) {
    throw new Error(`${nombre}: debe tener al menos una línea`);
  }

  for (let i = 0; i < solicitud.lineas.length; i++) {
    const linea = solicitud.lineas[i];

    if (!linea.itemCode || !String(linea.itemCode).trim()) {
      throw new Error(`${nombre}: itemCode es obligatorio en la línea ${i + 1}`);
    }

    if (
      linea.quantity === undefined ||
      linea.quantity === null ||
      Number.isNaN(Number(linea.quantity)) ||
      Number(linea.quantity) <= 0
    ) {
      throw new Error(`${nombre}: quantity inválido en la línea ${i + 1}`);
    }
  }
};

const validarSolicitudesPorTarget = (obj, nombre) => {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    validarSolicitud(obj[key], `${nombre} (${key})`);
  }
};

/* ===============================
   HELPERS ACTIVIDADES PREVENTIVAS EXTRA
=============================== */
const validarActividadPreventivaExtra = (act, targetKey, esEquipo) => {
  if (!act || typeof act !== "object") {
    throw new Error(
      `Actividad preventiva extra inválida para ${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey}`
    );
  }

  if (!act.tarea || !String(act.tarea).trim()) {
    throw new Error(
      `Actividad preventiva extra sin tarea para ${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey}`
    );
  }

  if (!act.tipoTrabajo || !TIPOS_TRABAJO_PREVENTIVO.includes(act.tipoTrabajo)) {
    throw new Error(
      `TipoTrabajo preventivo inválido para ${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey}`
    );
  }

  if (!act.rolTecnico || !String(act.rolTecnico).trim()) {
    throw new Error(
      `rolTecnico es obligatorio en actividad preventiva extra (${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey})`
    );
  }

  const cantidad = normalizarCantidadTecnicos(act.cantidadTecnicos);
  if (!cantidad) {
    throw new Error(
      `cantidadTecnicos debe ser > 0 en actividad preventiva extra (${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey})`
    );
  }

  const { unidadDuracion, duracionEstimadaValor, duracionEstimadaMin } =
    normalizarDuracionActividad(act);

  if (
    duracionEstimadaValor === null ||
    duracionEstimadaMin === null ||
    duracionEstimadaMin < 0
  ) {
    throw new Error(
      `Duración inválida en actividad preventiva extra (${
        esEquipo ? "equipo" : "ubicación técnica"
      } ${targetKey})`
    );
  }

  return {
    codigoActividad: toNullableString(act.codigoActividad),
    sistema: toNullableString(act.sistema),
    subsistema: toNullableString(act.subsistema),
    componente: toNullableString(act.componente),
    tarea: String(act.tarea).trim(),
    descripcion: toNullableString(act.descripcion),
    tipoTrabajo: act.tipoTrabajo,
    rolTecnico: String(act.rolTecnico).trim(),
    cantidadTecnicos: cantidad,
    duracionEstimadaValor,
    unidadDuracion,
    duracionEstimadaMin,
    observaciones: toNullableString(act.observaciones),
  };
};

/* ===============================
   HELPERS CREAR SOLICITUD COMPRA
=============================== */
const crearSolicitudCompra = async ({
  data,
  tratamientoId,
  usuarioId,
  t,
  esGeneral,
  equipoId = null,
  ubicacionId = null,
  aviso,
}) => {
  const requester = String(data.requester || data.email || "").trim();

  if (!requester) {
    throw new Error("Solicitud de compra: requester o email es obligatorio");
  }

  const ordenVenta = await obtenerOrdenVentaParaTarget({
    aviso,
    equipoId,
    ubicacionId,
    transaction: t,
  });

  const numeroSolicitud = await generarNumeroSolicitud({
    modelo: SolicitudCompra,
    prefijo: "SC",
    ordenVenta,
    transaction: t,
  });

  const solicitud = await SolicitudCompra.create(
    {
      numeroSolicitud,
      tratamiento_id: tratamientoId,
      equipo_id: equipoId,
      ubicacion_tecnica_id: ubicacionId,
      esGeneral,
      docDate: new Date(),
      requiredDate: data.requiredDate,
      department: data.department || null,
      requester,
      comments: data.comments || null,
      usuario_id: usuarioId,
      estado: "DRAFT",
    },
    { transaction: t }
  );

  await SolicitudCompraLinea.bulkCreate(
    data.lineas.map((l) => ({
      solicitud_compra_id: solicitud.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: l.quantity,
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costCenter || l.costingCode || null,
      projectCode: l.projectCode || null,
      rubroId: l.rubroId || null,
      paqueteTrabajoId: l.paqueteTrabajoId || null,
    })),
    { transaction: t }
  );

  return solicitud;
};

/* ===============================
   HELPERS CREAR SOLICITUD ALMACEN
=============================== */
const crearSolicitudAlmacen = async ({
  data,
  tratamientoId,
  usuarioId,
  t,
  esGeneral,
  equipoId = null,
  ubicacionId = null,
  aviso,
}) => {
  const requester = String(data.requester || data.email || "").trim();

  if (!requester) {
    throw new Error("Solicitud de almacén: requester o email es obligatorio");
  }

  const ordenVenta = await obtenerOrdenVentaParaTarget({
    aviso,
    equipoId,
    ubicacionId,
    transaction: t,
  });

  const numeroSolicitud = await generarNumeroSolicitud({
    modelo: SolicitudAlmacen,
    prefijo: "SA",
    ordenVenta,
    transaction: t,
  });

  const solicitud = await SolicitudAlmacen.create(
    {
      numeroSolicitud,
      tratamiento_id: tratamientoId,
      equipo_id: equipoId,
      ubicacion_tecnica_id: ubicacionId,
      esGeneral,
      docDate: new Date(),
      requiredDate: data.requiredDate,
      department: data.department || null,
      requester,
      comments: data.comments || null,
      usuario_id: usuarioId,
      estado: "DRAFT",
    },
    { transaction: t }
  );

  await SolicitudAlmacenLinea.bulkCreate(
    data.lineas.map((l) => ({
      solicitud_almacen_id: solicitud.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode,
      description: l.description || "",
      quantity: l.quantity,
      warehouseCode: l.warehouseCode || "01",
      costingCode: l.costCenter || l.costingCode || null,
      projectCode: l.projectCode || null,
       rubroId: l.rubroId || null,
    paqueteTrabajoId: l.paqueteTrabajoId || null,
    })),
    { transaction: t }
  );

  return solicitud;
};

/* ===============================
   CONTROLADOR PRINCIPAL
=============================== */
const crearTratamiento = async ({ avisoId, body, usuarioId }) => {
  const t = await sequelize.transaction();

  try {
    const {
      tratamiento,

      solicitudCompraGeneral: rawSolicitudCompraGeneral = null,
      solicitudesCompraPorEquipo: rawSolicitudesCompraPorEquipo = {},

      solicitudAlmacenGeneral: rawSolicitudAlmacenGeneral = null,
      solicitudesAlmacenPorEquipo: rawSolicitudesAlmacenPorEquipo = {},
    } = body;

    const solicitudCompraGeneral =
      normalizarSolicitudOpcional(rawSolicitudCompraGeneral);

    const solicitudesCompraPorEquipo =
      normalizarSolicitudesPorTarget(rawSolicitudesCompraPorEquipo);

    const solicitudAlmacenGeneral =
      normalizarSolicitudOpcional(rawSolicitudAlmacenGeneral);

    const solicitudesAlmacenPorEquipo =
      normalizarSolicitudesPorTarget(rawSolicitudesAlmacenPorEquipo);

    const actividadesPlanEditadas =
      tratamiento?.actividadesPlanEditadas || {};

    if (!tratamiento) {
      throw new Error("Datos de tratamiento requeridos");
    }

    validarSolicitud(solicitudCompraGeneral, "Solicitud de compra general");
    validarSolicitudesPorTarget(
      solicitudesCompraPorEquipo,
      "Solicitud de compra por equipo/ubicación"
    );

    validarSolicitud(solicitudAlmacenGeneral, "Solicitud de almacén general");
    validarSolicitudesPorTarget(
      solicitudesAlmacenPorEquipo,
      "Solicitud de almacén por equipo/ubicación"
    );

    const existe = await Tratamiento.findOne({
      where: { aviso_id: avisoId },
      transaction: t,
    });

    if (existe) {
      throw new Error("Este aviso ya tiene un tratamiento registrado");
    }

    const aviso = await Aviso.findByPk(avisoId, {
      include: [
        { association: "equiposRelacion" },
        { association: "ubicacionesRelacion" },
      ],
      transaction: t,
    });

    if (!aviso) {
      throw new Error("Aviso no encontrado");
    }

    const targets = [
      ...(aviso.equiposRelacion || []).map((rel) => ({
        equipoId: rel.equipoId,
        ubicacionId: null,
      })),
      ...(aviso.ubicacionesRelacion || []).map((rel) => ({
        equipoId: null,
        ubicacionId: rel.ubicacionTecnicaId || rel.ubicacionId || null,
      })),
    ].filter((x) => x.equipoId || x.ubicacionId);

    if (!targets.length) {
      throw new Error("El aviso no tiene equipos ni ubicaciones técnicas asociadas");
    }

    for (const target of targets) {
      if (!target.equipoId && !target.ubicacionId) {
        throw new Error("Se encontró un target inválido sin equipoId ni ubicacionId");
      }
    }

    const tieneSolicitudes =
      !!solicitudCompraGeneral ||
      !!solicitudAlmacenGeneral ||
      Object.keys(solicitudesCompraPorEquipo).length > 0 ||
      Object.keys(solicitudesAlmacenPorEquipo).length > 0;

    const nuevoTratamiento = await Tratamiento.create(
      {
        aviso_id: avisoId,
        creado_por: usuarioId,
        estado: tieneSolicitudes ? "CON_SOLICITUD" : "SIN_SOLICITUD",
      },
      { transaction: t }
    );

    for (const target of targets) {
      const targetKey = String(target.equipoId || target.ubicacionId);

      const te = await TratamientoEquipo.create(
        {
          tratamientoId: nuevoTratamiento.id,
          equipoId: target.equipoId,
          ubicacionTecnicaId: target.ubicacionId,
        },
        { transaction: t }
      );

      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Preventivo"
      ) {
        const planIdSeleccionado = tratamiento.planesSeleccionados?.[targetKey];

        if (!planIdSeleccionado) {
          throw new Error(
            `Debe seleccionar un plan para ${
              target.equipoId ? "el equipo" : "la ubicación técnica"
            } ${targetKey}`
          );
        }

        const plan = await PlanMantenimiento.findByPk(planIdSeleccionado, {
          include: [{ association: "actividades" }],
          transaction: t,
        });

        if (!plan) {
          throw new Error(
            `Plan no válido para ${
              target.equipoId ? "el equipo" : "la ubicación técnica"
            } ${targetKey}`
          );
        }

        if (target.equipoId && plan.contextoObjetivo !== "EQUIPO") {
          throw new Error(
            `El plan seleccionado no corresponde al contexto EQUIPO (${targetKey})`
          );
        }

        if (target.ubicacionId && plan.contextoObjetivo !== "UBICACION_TECNICA") {
          throw new Error(
            `El plan seleccionado no corresponde al contexto UBICACION_TECNICA (${targetKey})`
          );
        }

        await te.update(
          { planMantenimientoId: plan.id },
          { transaction: t }
        );

        const edits = Array.isArray(actividadesPlanEditadas[targetKey])
          ? actividadesPlanEditadas[targetKey]
          : [];

        const idsActividadesPlan = new Set(
          (plan.actividades || []).map((a) => String(a.id))
        );

        for (let i = 0; i < edits.length; i++) {
          const edit = edits[i];

          const planActividadIdRaw = edit?.planMantenimientoActividadId;
          const planActividadId =
            planActividadIdRaw === null ||
            planActividadIdRaw === undefined ||
            String(planActividadIdRaw).trim() === "" ||
            String(planActividadIdRaw).trim().toLowerCase() === "null" ||
            String(planActividadIdRaw).trim().toLowerCase() === "undefined"
              ? null
              : String(planActividadIdRaw).trim();

          if (planActividadId && !idsActividadesPlan.has(planActividadId)) {
            throw new Error(
              `planMantenimientoActividadId inválido en tratamiento.actividadesPlanEditadas (${targetKey})[${i}]`
            );
          }

          edit.planMantenimientoActividadId = planActividadId;
        }

        for (const act of plan.actividades || []) {
          const edit = edits.find((e) => {
            const raw = e?.planMantenimientoActividadId;

            const normalizado =
              raw === null ||
              raw === undefined ||
              String(raw).trim() === "" ||
              String(raw).trim().toLowerCase() === "null" ||
              String(raw).trim().toLowerCase() === "undefined"
                ? null
                : String(raw).trim();

            return normalizado === String(act.id);
          });

          const unidadBase = act.unidadDuracion || "min";
          const minBase = act.duracionMinutos ?? null;
          const valorBase =
            minBase == null
              ? null
              : unidadBase === "h"
              ? Number(minBase) / 60
              : Number(minBase);

          const unidadFinal = edit?.unidadDuracion || unidadBase || "min";

          const valorFinal =
            edit?.duracionEstimadaValor !== undefined &&
            edit?.duracionEstimadaValor !== null
              ? Number(edit.duracionEstimadaValor)
              : valorBase;

          const minFinal =
            edit?.duracionEstimadaMin !== undefined &&
            edit?.duracionEstimadaMin !== null
              ? Number(edit.duracionEstimadaMin)
              : toMinutes(valorFinal, unidadFinal);

          const cantidadFinal =
            edit?.cantidadTecnicos !== undefined &&
            edit?.cantidadTecnicos !== null
              ? Number(edit.cantidadTecnicos)
              : Number(act.cantidadTecnicos ?? 1);

          const observacionesFinal =
            edit?.observaciones !== undefined
              ? toNullableString(edit.observaciones)
              : null;

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              planMantenimientoActividadId: act.id,

              codigoActividad: act.codigoActividad || null,
              sistema: act.sistema || null,
              subsistema: act.subsistema || null,
              componente: act.componente || null,
              tarea: act.tarea || null,
              descripcion: act.descripcion || null,

              tipoTrabajo: act.tipoTrabajo || null,
              rolTecnico: act.rolTecnico || null,
              cantidadTecnicos: cantidadFinal > 0 ? cantidadFinal : 1,

              duracionEstimadaValor: valorFinal,
              unidadDuracion: unidadFinal,
              duracionEstimadaMin: minFinal,

              observaciones: observacionesFinal,
              origen: "PLAN",
              estado: "PENDIENTE",
            },
            { transaction: t }
          );
        }

        const actividadesExtras = edits.filter((e) => {
          const raw = e?.planMantenimientoActividadId;

          const normalizado =
            raw === null ||
            raw === undefined ||
            String(raw).trim() === "" ||
            String(raw).trim().toLowerCase() === "null" ||
            String(raw).trim().toLowerCase() === "undefined"
              ? null
              : String(raw).trim();

          return !normalizado;
        });

        for (const act of actividadesExtras) {
          const normalizada = validarActividadPreventivaExtra(
            act,
            targetKey,
            !!target.equipoId
          );

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,
              planMantenimientoActividadId: null,
              codigoActividad: normalizada.codigoActividad || null,

              sistema: normalizada.sistema,
              subsistema: normalizada.subsistema,
              componente: normalizada.componente,
              tarea: normalizada.tarea,
              descripcion: normalizada.descripcion,

              tipoTrabajo: normalizada.tipoTrabajo,
              rolTecnico: normalizada.rolTecnico,
              cantidadTecnicos: normalizada.cantidadTecnicos,

              duracionEstimadaValor: normalizada.duracionEstimadaValor,
              unidadDuracion: normalizada.unidadDuracion,
              duracionEstimadaMin: normalizada.duracionEstimadaMin,

              observaciones: normalizada.observaciones,
              origen: "MANUAL_EXTRA",
              estado: "PENDIENTE",
            },
            { transaction: t }
          );
        }
      }

      if (
        aviso.tipoAviso === "mantenimiento" &&
        aviso.tipoMantenimiento === "Correctivo"
      ) {
        const manuales = tratamiento.actividadesManuales?.[targetKey] || [];

        if (!Array.isArray(manuales)) {
          throw new Error(
            `Actividades manuales inválidas para ${
              target.equipoId ? "equipo" : "ubicación técnica"
            } ${targetKey}`
          );
        }

        if (manuales.length === 0) {
          throw new Error(
            `Debe agregar actividades manuales para ${
              target.equipoId ? "equipo" : "ubicación técnica"
            } ${targetKey}`
          );
        }

        for (const act of manuales) {
          if (!act.tarea || !String(act.tarea).trim()) {
            throw new Error(
              `Actividad manual sin tarea para ${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey}`
            );
          }

          if (
            act.tipoTrabajo &&
            !TIPOS_TRABAJO_CORRECTIVO.includes(act.tipoTrabajo)
          ) {
            throw new Error(
              `TipoTrabajo inválido (solo REPARACION o CAMBIO) para ${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey}`
            );
          }

          if (!act.rolTecnico) {
            throw new Error(
              `rolTecnico es obligatorio en actividad manual (${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey})`
            );
          }

          if (!act.cantidadTecnicos || Number(act.cantidadTecnicos) <= 0) {
            throw new Error(
              `cantidadTecnicos debe ser > 0 en actividad manual (${
                target.equipoId ? "equipo" : "ubicación técnica"
              } ${targetKey})`
            );
          }

          const unidad = act.unidadDuracion || "min";
          const min =
            act.duracionEstimadaMin ??
            toMinutes(act.duracionEstimadaValor, unidad);

          await TratamientoEquipoActividad.create(
            {
              tratamientoEquipoId: te.id,

              planMantenimientoActividadId: null,
              codigoActividad: null,

              sistema: act.sistema || null,
              subsistema: act.subsistema || null,
              componente: act.componente || null,

              tarea: String(act.tarea).trim(),
              descripcion: act.descripcion || null,

              tipoTrabajo: act.tipoTrabajo || "REPARACION",

              rolTecnico: act.rolTecnico,
              cantidadTecnicos: Number(act.cantidadTecnicos),

              duracionEstimadaValor: act.duracionEstimadaValor ?? null,
              unidadDuracion: unidad,
              duracionEstimadaMin: min,

              observaciones: act.observaciones || null,
              origen: "MANUAL",
              estado: "PENDIENTE",
            },
            { transaction: t }
          );
        }
      }
    }

    if (solicitudCompraGeneral) {
      await crearSolicitudCompra({
        data: solicitudCompraGeneral,
        tratamientoId: nuevoTratamiento.id,
        usuarioId,
        t,
        esGeneral: true,
        aviso,
      });
    }

    for (const target of targets) {
      const key = String(target.equipoId || target.ubicacionId);
      const dataSolicitud = solicitudesCompraPorEquipo[key];

      if (!dataSolicitud) continue;

      await crearSolicitudCompra({
        data: dataSolicitud,
        tratamientoId: nuevoTratamiento.id,
        usuarioId,
        t,
        esGeneral: false,
        equipoId: target.equipoId,
        ubicacionId: target.ubicacionId,
        aviso,
      });
    }

    if (solicitudAlmacenGeneral) {
      await crearSolicitudAlmacen({
        data: solicitudAlmacenGeneral,
        tratamientoId: nuevoTratamiento.id,
        usuarioId,
        t,
        esGeneral: true,
        aviso,
      });
    }

    for (const target of targets) {
      const key = String(target.equipoId || target.ubicacionId);
      const dataSolicitud = solicitudesAlmacenPorEquipo[key];

      if (!dataSolicitud) continue;

      await crearSolicitudAlmacen({
        data: dataSolicitud,
        tratamientoId: nuevoTratamiento.id,
        usuarioId,
        t,
        esGeneral: false,
        equipoId: target.equipoId,
        ubicacionId: target.ubicacionId,
        aviso,
      });
    }

    await Aviso.update(
      { estadoAviso: "tratado" },
      { where: { id: avisoId }, transaction: t }
    );

    const tratamientoCompleto = await Tratamiento.findByPk(
      nuevoTratamiento.id,
      {
        include: [
          {
            model: SolicitudCompra,
            as: "solicitudesCompra",
            include: [{ model: SolicitudCompraLinea, as: "lineas" }],
          },
          {
            model: SolicitudAlmacen,
            as: "solicitudesAlmacen",
            include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
          },
          {
            model: TratamientoEquipo,
            as: "equipos",
            include: [
              { model: Equipo, as: "equipo" },
              { model: UbicacionTecnica, as: "ubicacionTecnica" },
              {
                model: TratamientoEquipoActividad,
                as: "actividades",
                include: [
                  { model: PlanMantenimientoActividad, as: "actividadPlan" },
                ],
              },
              { model: PlanMantenimiento, as: "planMantenimiento" },
            ],
          },
        ],
        transaction: t,
      }
    );

    await t.commit();
    return tratamientoCompleto;
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
        model: SolicitudCompra,
        as: "solicitudesCompra",
        include: [{ model: SolicitudCompraLinea, as: "lineas" }],
      },
      {
        model: SolicitudAlmacen,
        as: "solicitudesAlmacen",
        include: [{ model: SolicitudAlmacenLinea, as: "lineas" }],
      },
      {
        model: TratamientoEquipo,
        as: "equipos",
        include: [
          { model: Equipo, as: "equipo" },
          { model: UbicacionTecnica, as: "ubicacionTecnica" },
          {
            model: TratamientoEquipoActividad,
            as: "actividades",
            include: [{ model: PlanMantenimientoActividad, as: "actividadPlan" }],
          },
          { model: PlanMantenimiento, as: "planMantenimiento" },
        ],
      },
    ],
    order: [
      [{ model: SolicitudCompra, as: "solicitudesCompra" }, "createdAt", "ASC"],
      [{ model: SolicitudAlmacen, as: "solicitudesAlmacen" }, "createdAt", "ASC"],
      [{ model: TratamientoEquipo, as: "equipos" }, "createdAt", "ASC"],
      [
        { model: TratamientoEquipo, as: "equipos" },
        { model: TratamientoEquipoActividad, as: "actividades" },
        "createdAt",
        "ASC",
      ],
    ],
  });
};

const upsertSolicitud = async ({
  tratamientoId,
  esGeneral,
  equipoId,
  ubicacionId,
  data,
  usuarioId,
  t,
  aviso,
}) => {
  const where = {
    tratamiento_id: tratamientoId,
    esGeneral: !!esGeneral,
    equipo_id: equipoId || null,
    ubicacion_tecnica_id: ubicacionId || null,
  };

  let solicitud = await SolicitudCompra.findOne({ where, transaction: t });

  const requester = String(data.requester || data.email || "").trim();

  if (!requester) {
    throw new Error("Solicitud de compra: requester o email es obligatorio");
  }

  const header = {
    docDate: new Date(),
    requiredDate: data.requiredDate,
    department: data.department || null,
    requester,
    comments: data.comments || null,
    usuario_id: usuarioId,
    estado: "DRAFT",
    tratamiento_id: tratamientoId,
    esGeneral: !!esGeneral,
    equipo_id: equipoId || null,
    ubicacion_tecnica_id: ubicacionId || null,
  };

  if (!solicitud) {
    const ordenVenta = await obtenerOrdenVentaParaTarget({
      aviso,
      equipoId,
      ubicacionId,
      transaction: t,
    });

    const numeroSolicitud = await generarNumeroSolicitud({
      modelo: SolicitudCompra,
      prefijo: "SC",
      ordenVenta,
      transaction: t,
    });

    solicitud = await SolicitudCompra.create(
      {
        ...header,
        numeroSolicitud,
      },
      { transaction: t }
    );
  } else {
    await solicitud.update(header, { transaction: t });

    await SolicitudCompraLinea.destroy({
      where: { solicitud_compra_id: solicitud.id },
      transaction: t,
    });
  }

  await SolicitudCompraLinea.bulkCreate(
    (data.lineas || []).map((l) => ({
      solicitud_compra_id: solicitud.id,
      itemId: l.itemId || null,
      itemCode: l.itemCode || null,
      description: l.description || null,
      quantity: Number(l.quantity),
      costingCode: l.costCenter || l.costingCode || null,
      projectCode: l.projectCode || null,
      warehouseCode: l.warehouseCode,
      rubroId: l.rubroId || null,
paqueteTrabajoId: l.paqueteTrabajoId || null,
    })),
    { transaction: t }
  );

  return solicitud;
};

const guardarCambiosTratamiento = async ({ tratamientoId, body, usuarioId }) => {
  const t = await sequelize.transaction();

  try {
    const { actividades = [], solicitudGeneral, solicitudesPorEquipo = {} } =
      body || {};

    const tratamiento = await Tratamiento.findByPk(tratamientoId, { transaction: t });
    if (!tratamiento) throw new Error("Tratamiento no encontrado");

    const aviso = await Aviso.findByPk(tratamiento.aviso_id, { transaction: t });
    if (!aviso) throw new Error("Aviso no encontrado");

    if (Array.isArray(actividades) && actividades.length > 0) {
      for (const a of actividades) {
        const act = await TratamientoEquipoActividad.findByPk(a.id, {
          include: [
            {
              model: TratamientoEquipo,
              as: "tratamientoEquipo",
              attributes: ["id", "tratamientoId"],
            },
          ],
          transaction: t,
        });

        if (!act) throw new Error(`Actividad no encontrada: ${a.id}`);
        if (act.tratamientoEquipo?.tratamientoId !== tratamientoId) {
          throw new Error(`Actividad ${a.id} no pertenece a este tratamiento`);
        }

        const unidad = a.unidadDuracion || act.unidadDuracion || "min";
        const valor =
          a.duracionEstimadaValor !== undefined
            ? a.duracionEstimadaValor
            : act.duracionEstimadaValor;

        const min = toMinutes(valor, unidad);

        await act.update(
          {
            duracionEstimadaValor: valor ?? null,
            unidadDuracion: unidad,
            duracionEstimadaMin: min,
            ...(a.cantidadTecnicos !== undefined
              ? { cantidadTecnicos: Number(a.cantidadTecnicos) }
              : {}),
            ...(a.rolTecnico !== undefined ? { rolTecnico: a.rolTecnico } : {}),
            ...(a.observaciones !== undefined
              ? { observaciones: toNullableString(a.observaciones) }
              : {}),
            ...(a.estado ? { estado: a.estado } : {}),
          },
          { transaction: t }
        );
      }
    }

    if (solicitudGeneral) {
      await upsertSolicitud({
        tratamientoId,
        esGeneral: true,
        equipoId: null,
        ubicacionId: null,
        data: solicitudGeneral,
        usuarioId,
        t,
        aviso,
      });
    }

    const tes = await TratamientoEquipo.findAll({
      where: { tratamientoId },
      attributes: ["equipoId", "ubicacionTecnicaId"],
      transaction: t,
    });

    const mapTargets = new Map();

    for (const te of tes) {
      if (te.equipoId) {
        mapTargets.set(String(te.equipoId), {
          equipoId: te.equipoId,
          ubicacionId: null,
        });
      }

      if (te.ubicacionTecnicaId) {
        mapTargets.set(String(te.ubicacionTecnicaId), {
          equipoId: null,
          ubicacionId: te.ubicacionTecnicaId,
        });
      }
    }

    for (const [key, dataSol] of Object.entries(solicitudesPorEquipo || {})) {
      if (!dataSol) continue;

      const target = mapTargets.get(String(key));
      if (!target) {
        throw new Error(`Target inválido en solicitudesPorEquipo: ${key}`);
      }

      await upsertSolicitud({
        tratamientoId,
        esGeneral: false,
        equipoId: target.equipoId,
        ubicacionId: target.ubicacionId,
        data: dataSol,
        usuarioId,
        t,
        aviso,
      });
    }

    await t.commit();
    return { ok: true, message: "Cambios guardados", tratamientoId };
  } catch (e) {
    await t.rollback();
    throw e;
  }
};

module.exports = {
  crearTratamiento,
  obtenerTratamientoPorAviso,
  guardarCambiosTratamiento,
};