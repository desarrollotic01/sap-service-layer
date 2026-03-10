const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notificacion = sequelize.define(
    "Notificacion",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      fechaInicio: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      fechaFin: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      fechaUltimoMantenimientoPreventivo: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      horometro: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      numeroMisiones: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      numeroEquipo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      codigoRepuesto: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      descripcionMantenimiento: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      resumenCorrectivos: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      descripcionGeneral: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      recomendaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      estadoGeneralEquipo: {
        type: DataTypes.ENUM(
          "OPERATIVO",
          "INOPERATIVO",
          "OPERATIVO_CON_OBSERVACIONES"
        ),
        allowNull: false,
      },

      estado: {
        type: DataTypes.ENUM(
          "BORRADOR",
          "FINALIZADO",
          "APROBADO",
          "RECHAZADO"
        ),
        defaultValue: "BORRADOR",
      },

      ordenTrabajoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      ordenTrabajoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "notificaciones",
      timestamps: true,
    }
  );

  Notificacion.associate = (models) => {
    Notificacion.belongsTo(models.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    Notificacion.belongsTo(models.OrdenTrabajoEquipo, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "equipoOT",
    });

    Notificacion.belongsToMany(models.Trabajador, {
      through: "NotificacionTrabajadores",
      foreignKey: "notificacionId",
      otherKey: "trabajadorId",
      as: "tecnicos",
    });

    Notificacion.hasMany(models.NotificacionPlan, {
      foreignKey: "notificacionId",
      as: "planes",
    });

    Notificacion.hasMany(models.Adjunto, {
      foreignKey: "notificacionId",
      as: "adjuntos",
    });

    models.OrdenTrabajoEquipo.hasOne(models.Notificacion, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "notificacion",
    });
  };

  return Notificacion;
};