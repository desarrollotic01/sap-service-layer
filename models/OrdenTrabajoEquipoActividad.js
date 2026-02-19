const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenTrabajoEquipoActividad = sequelize.define(
    "OrdenTrabajoEquipoActividad",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      ordenTrabajoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      planMantenimientoActividadId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      componente: DataTypes.STRING,
      tarea: DataTypes.STRING,

      // ✅ SINCRONIZADO con PlanMantenimientoActividad + valores extra
      tipoTrabajo: {
        type: DataTypes.ENUM(
          "TORQUEO_REGULACION",
          "APLICACION",
          "REVISION",
          "INSPECCION",
          "CAMBIO",
          "LIMPIEZA",
          "AJUSTE",        // ← era solo de OT, lo mantenemos
          "LUBRICACION"    // ← era solo de OT, lo mantenemos
        ),
      },

      duracionEstimadaMin: DataTypes.INTEGER,
      duracionRealMin: DataTypes.INTEGER,

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "EN_PROCESO", "COMPLETADA", "OMITIDA"),
        defaultValue: "PENDIENTE",
      },

      // ✅ NUEVO: distinguir origen
      origen: {
        type: DataTypes.ENUM("PLAN", "MANUAL"),
        allowNull: false,
        defaultValue: "PLAN",
      },

      observaciones: DataTypes.TEXT,
    },
    {
      tableName: "orden_trabajo_equipo_actividades",
      timestamps: true,
    }
  );

  OrdenTrabajoEquipoActividad.associate = (models) => {
    OrdenTrabajoEquipoActividad.belongsTo(models.OrdenTrabajoEquipo, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "equipoOT",
    });

    OrdenTrabajoEquipoActividad.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "planMantenimientoActividadId",
      as: "actividadPlan",
    });
  };

  return OrdenTrabajoEquipoActividad;
};