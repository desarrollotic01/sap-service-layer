// models/TratamientoEquipoActividad.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoEquipoActividad = sequelize.define(
    "TratamientoEquipoActividad",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      tratamientoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // 🔗 referencia al plan (si viene de plan)
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
          "LUBRICACION",
          "REPARACION" 

        ),
        allowNull: true,
      },

      // ✅ NUEVO: el valor tal cual lo elige el usuario (ej: 2, 30, 1.5)
      duracionEstimadaValor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      // ✅ NUEVO: unidad de la duración estimada
      unidadDuracion: {
        type: DataTypes.ENUM("min", "h"),
        allowNull: false,
        defaultValue: "min",
      },

      // ✅ Estándar del sistema (minutos) para cálculos/reportes
      duracionEstimadaMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "LISTA", "OMITIDA"),
        defaultValue: "PENDIENTE",
      },

      origen: {
        type: DataTypes.ENUM("PLAN", "MANUAL"),
        allowNull: false,
        defaultValue: "PLAN",
      },

      descripcion: {
  type: DataTypes.TEXT,
  allowNull: true,
},

      observaciones: DataTypes.TEXT,
    },
    {
      tableName: "tratamiento_equipo_actividades",
      timestamps: true,
    }
  );

  TratamientoEquipoActividad.associate = (models) => {
    TratamientoEquipoActividad.belongsTo(models.TratamientoEquipo, {
      foreignKey: "tratamientoEquipoId",
      as: "tratamientoEquipo",
    });

    TratamientoEquipoActividad.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "planMantenimientoActividadId",
      as: "actividadPlan",
    });
  };

  return TratamientoEquipoActividad;
};