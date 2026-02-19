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

      // Tipo físico del archivo
      extension: {
        type: DataTypes.STRING, // pdf, jpg, png, etc
      },

      // Tipo funcional del adjunto
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
      },

      // ===============================
      // RELACIONES
      // ===============================

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

      equipoId: {
  type: DataTypes.UUID,
  allowNull: true,
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

    Adjunto.belongsTo(models.Equipo, {
  foreignKey: "equipoId",
  as: "equipo",
});


  };

  return Adjunto;
};
