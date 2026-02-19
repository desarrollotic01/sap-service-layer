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

      estado: {
        type: DataTypes.ENUM("OK", "NO_OK", "NO_APLICA"),
        allowNull: false,
      },

      comentario: {
        type: DataTypes.TEXT,
      },

      notificacionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ← referencia a OrdenTrabajoEquipoActividad
      ordenTrabajoActividadId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ← nullable, solo si la actividad viene de un plan
      planMantenimientoId: {
        type: DataTypes.UUID,
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
    });

    NotificacionPlan.belongsTo(models.OrdenTrabajoEquipoActividad, {
      foreignKey: "ordenTrabajoActividadId",
      as: "actividad",
    });

    NotificacionPlan.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "plan",
    });
  };

  return NotificacionPlan;
};