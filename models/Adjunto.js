const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Adjunto = sequelize.define(
    "Adjunto",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      extension: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      categoria: {
        type: DataTypes.ENUM(
          "ANTES",
          "DESPUES",
          "CORRECTIVO",
          "ACTA_CONFORMIDAD",
          "INFORME",
          "CHECKLIST",
          "OTRO"
        ),
        allowNull: true,
      },

      ordenTrabajoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      ordenTrabajoEquipoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      planMantenimientoActividadId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      notificacionId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      notificacionPlanId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      equipoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      grupo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      mostrarEnPortal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      tituloPortal: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      descripcionPortal: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ordenPortal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "adjuntos",
      timestamps: true,
    }
  );

  Adjunto.associate = (models) => {
    Adjunto.belongsTo(models.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    Adjunto.belongsTo(models.OrdenTrabajoEquipo, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "equipoOT",
    });

    Adjunto.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "planMantenimientoActividadId",
      as: "actividadPlan",
    });

    Adjunto.belongsTo(models.Notificacion, {
      foreignKey: "notificacionId",
      as: "notificacion",
    });

    Adjunto.belongsTo(models.NotificacionPlan, {
      foreignKey: "notificacionPlanId",
      as: "notificacionPlan",
    });

    Adjunto.belongsTo(models.Equipo, {
      foreignKey: "equipoId",
      as: "equipo",
    });

    Adjunto.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "plan",
    });
  };

  return Adjunto;
};