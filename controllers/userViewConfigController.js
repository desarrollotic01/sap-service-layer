const { UserViewConfig } = require("../db_connection");

/* =============================
   OBTENER CONFIG POR VISTA
============================= */
async function obtenerConfig(userId, view) {
  let config = await UserViewConfig.findOne({
    where: { userId, view },
  });

  // Si no existe, la creamos por defecto
  if (!config) {
    config = await UserViewConfig.create({
      userId,
      view,
      cardFields: {},
      columnOrder: [],
      filters: {
        search: "",
        prioridad: "",
        tipoMantenimiento: "",
        solicitante: "",
      },
    });
  }

  return config;
}

/* =============================
   GUARDAR / ACTUALIZAR CONFIG
============================= */
async function guardarConfig(userId, view, data) {
  const config = await obtenerConfig(userId, view);

  await config.update({
    cardFields: data.cardFields ?? config.cardFields,
    columnOrder: data.columnOrder ?? config.columnOrder,
    filters: data.filters ?? config.filters,
  });

  return config;
}

/* =============================
   RESET SOLO FILTROS
============================= */
async function resetFiltros(userId, view) {
  const config = await obtenerConfig(userId, view);

  await config.update({
    filters: {
      search: "",
      prioridad: "",
      tipoMantenimiento: "",
      solicitante: "",
    },
  });

  return config;
}

module.exports = {
  obtenerConfig,
  guardarConfig,
  resetFiltros,
};