const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const NotificacionPlan = sequelize.define(
    "NotificacionPlan",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      notificacionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      ordenTrabajoActividadId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("OK", "NO_OK", "NO_APLICA"),
        allowNull: false,
      },

      comentario: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      trabajadorId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ✅ duración real ejecutada de la actividad
      duracionPlan: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      unidadDuracionPlan: {
        type: DataTypes.ENUM("min", "h"),
        allowNull: true,
      },

      // ✅ inicio/fin real de la actividad
      fechaInicioPlan: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      fechaFinPlan: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "notificacion_planes",
      timestamps: true,
    }
  );

  NotificacionPlan.associate = (models) => {
    NotificacionPlan.belongsTo(models.Notificacion, {
      foreignKey: "notificacionId",
      as: "notificacion",
    });

    NotificacionPlan.belongsTo(models.OrdenTrabajoEquipoActividad, {
      foreignKey: "ordenTrabajoActividadId",
      as: "actividad",
    });

    NotificacionPlan.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "plan",
    });

    NotificacionPlan.belongsTo(models.Trabajador, {
      foreignKey: "trabajadorId",
      as: "trabajador",
    });

    NotificacionPlan.hasMany(models.Adjunto, {
      foreignKey: "notificacionPlanId",
      as: "adjuntos",
    });
  };

  return NotificacionPlan;
};