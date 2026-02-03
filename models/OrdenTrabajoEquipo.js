const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
 const OrdenTrabajoEquipo = sequelize.define(
  "OrdenTrabajoEquipo",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    ordenTrabajoId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    equipoId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    // 📋 descripción detallada del trabajo en ese equipo
    descripcionEquipo: {
      type: DataTypes.TEXT,
    },

    // ⚠️ prioridad por equipo
    prioridad: {
      type: DataTypes.ENUM(
        "BAJA",
        "MEDIA",
        "ALTA",
        "CRITICA"
      ),
      defaultValue: "MEDIA",
    },

    // 🔧 actividad a realizar
    tipoActividad: {
      type: DataTypes.STRING,
    },

    // 📅 fechas y horas propias
    fechaInicioProgramada: DataTypes.DATE,
    fechaFinProgramada: DataTypes.DATE,
    fechaInicioReal: DataTypes.DATE,
    fechaFinReal: DataTypes.DATE,

    estadoEquipo: {
      type: DataTypes.ENUM(
        "PENDIENTE",
        "EN_PROCESO",
        "FINALIZADO",
        "CANCELADO"
      ),
      defaultValue: "PENDIENTE",
    },

    observaciones: DataTypes.TEXT,
  },
  {
    tableName: "orden_trabajo_equipos",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["ordenTrabajoId", "equipoId"],
      },
    ],
  }
);


  OrdenTrabajoEquipo.associate = (models) => {
    OrdenTrabajoEquipo.belongsTo(models.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    OrdenTrabajoEquipo.belongsTo(models.Equipo, {
      foreignKey: "equipoId",
      as: "equipo",
    });
  };

  return OrdenTrabajoEquipo;
};
