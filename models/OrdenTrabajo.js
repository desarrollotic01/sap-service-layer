const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenTrabajo = sequelize.define(
    "OrdenTrabajo",
    {
        id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },

  numeroOT: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  tipoMantenimiento: {
  type: DataTypes.ENUM(
    "Preventivo",
    "Correctivo",
    "Mejora",
    "Predictivo"
  ),
  allowNull: true,
},


  descripcionGeneral: DataTypes.TEXT,
  descripcionDetallada: DataTypes.TEXT,

  estado: {
    type: DataTypes.ENUM(
      "CREADO",
      "LIBERADO",
      "CIERRE_TECNICO",
      "CERRADO",
      "CANCELADO"
    ),
    defaultValue: "CREADO",
  },

 supervisorId: {
  type: DataTypes.UUID,
  allowNull: true, 
},

  fechaProgramadaInicio: DataTypes.DATE,
  fechaProgramadaFin: DataTypes.DATE,
  fechaInicioReal: DataTypes.DATE,
  fechaFinReal: DataTypes.DATE,
  fechaCierre: DataTypes.DATE,

  observaciones: DataTypes.TEXT,

  avisoId: DataTypes.UUID,
  tratamientoId: {
  type: DataTypes.UUID,
  allowNull: true, 
}
    },
    {
      tableName: "ordenes_trabajo",
      timestamps: true,
    }
  );

 OrdenTrabajo.associate = (models) => {
  OrdenTrabajo.belongsTo(models.Aviso, {
    foreignKey: "avisoId",
    as: "aviso",
  });

  OrdenTrabajo.belongsTo(models.Tratamiento, {
    foreignKey: "tratamientoId",
    as: "tratamiento",
  });

  OrdenTrabajo.hasMany(models.OrdenTrabajoEquipo, {
    foreignKey: "ordenTrabajoId",
    as: "equipos",
  });

   OrdenTrabajo.hasMany(models.Adjunto, {
    foreignKey: "ordenTrabajoId",
    as: "adjuntos",
  });

  OrdenTrabajo.hasMany(models.SolicitudCompra, {
  foreignKey: "ordenTrabajoId",
  as: "solicitudesCompra",
});


OrdenTrabajo.hasMany(models.SolicitudAlmacen, {
  foreignKey: "ordenTrabajoId",
  as: "solicitudesAlmacen",
});

OrdenTrabajo.belongsTo(models.Trabajador, {
  foreignKey: "supervisorId",
  as: "supervisor",
});
};

  return OrdenTrabajo;
};
