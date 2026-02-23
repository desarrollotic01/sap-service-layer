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
          "LUBRICACION"
        ),
      },

      duracionEstimadaMin: DataTypes.INTEGER,

      estado: {
        type: DataTypes.ENUM(
          "PENDIENTE",
          "LISTA",
          "OMITIDA"
        ),
        defaultValue: "PENDIENTE",
      },

      // 🔥 CLAVE PARA TU CASO
      origen: {
        type: DataTypes.ENUM("PLAN", "MANUAL"),
        allowNull: false,
        defaultValue: "PLAN",
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

    TratamientoEquipoActividad.belongsTo(
      models.PlanMantenimientoActividad,
      {
        foreignKey: "planMantenimientoActividadId",
        as: "actividadPlan",
      }
    );
  };

  return TratamientoEquipoActividad;
};