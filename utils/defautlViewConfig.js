const DEFAULT_VIEW_CONFIGS = {
  kanban: {
    cardFields: {
      numeroAviso: true,
      cliente: true,
      estado: true,
      equipo: true,
    },
    columnOrder: ["numeroAviso", "cliente", "estado", "equipo"],
    filters: {
      search: "",
      prioridad: "",
      tipoMantenimiento: "",
      solicitante: "",
    },
  },

  lista: {
    cardFields: {
      numeroAviso: true,
      cliente: true,
      estado: true,
      fecha: true,
      prioridad: true,
    },
    columnOrder: [
      "numeroAviso",
      "cliente",
      "estado",
      "fecha",
      "prioridad",
    ],
    filters: {
      search: "",
      prioridad: "",
      tipoMantenimiento: "",
      solicitante: "",
    },
  },

  calendario: {
    cardFields: {
      numeroAviso: true,
      cliente: true,
      estado: true,
    },
    columnOrder: ["numeroAviso", "cliente", "estado"],
    filters: {
      search: "",
      prioridad: "",
      tipoMantenimiento: "",
      solicitante: "",
    },
  },
};

module.exports = { DEFAULT_VIEW_CONFIGS };