// models/OrdenTrabajoEquipoActividad.js
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

      sistema: DataTypes.STRING,
      subsistema: DataTypes.STRING,
      componente: DataTypes.STRING,

      tarea: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      tipoTrabajo: {
        type: DataTypes.ENUM(
          "TORQUEO_REGULACION",
          "APLICACION",
          "REVISION",
          "INSPECCION",
          "CAMBIO",
          "LIMPIEZA",
          "AJUSTE",
          "LUBRICACION"
        ),
        allowNull: true,
      },

      // ✅ NUEVO: duración estimada con unidad
      duracionEstimadaValor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      unidadDuracion: {
        type: DataTypes.ENUM("min", "h"),
        allowNull: false,
        defaultValue: "min",
      },

      duracionEstimadaMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ✅ NUEVO: duración real con unidad (solo OT)
      duracionRealValor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      unidadDuracionReal: {
        type: DataTypes.ENUM("min", "h"),
        allowNull: false,
        defaultValue: "min",
      },

      duracionRealMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "EN_PROCESO", "COMPLETADA", "OMITIDA"),
        defaultValue: "PENDIENTE",
      },

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