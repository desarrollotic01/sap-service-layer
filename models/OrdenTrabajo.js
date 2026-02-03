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

  descripcionGeneral: DataTypes.TEXT, // antes "descripcion"

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

  supervisorId: DataTypes.STRING,

  fechaProgramadaInicio: DataTypes.DATE,
  fechaProgramadaFin: DataTypes.DATE,
  fechaInicioReal: DataTypes.DATE,
  fechaFinReal: DataTypes.DATE,
  fechaCierre: DataTypes.DATE,

  observaciones: DataTypes.TEXT,

  avisoId: DataTypes.UUID,
  tratamientoId: DataTypes.UUID
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
};

  return OrdenTrabajo;
};
