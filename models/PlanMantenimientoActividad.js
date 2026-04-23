const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlanMantenimientoActividad = sequelize.define(
    "PlanMantenimientoActividad",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      codigoActividad: {
        type: DataTypes.STRING,
        allowNull: false,
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
          "LIMPIEZA"
        ),
        allowNull: false,
      },

      rolTecnico: {
        type: DataTypes.ENUM(
          "tecnico_electrico",
          "operario_de_mantenimiento",
          "tecnico_mecanico",
          "supervisor"
        ),
        allowNull: true,
      },

      // ✅ guardar solo minutos reales
      duracionMinutos: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ✅ UI
      unidadDuracion: {
        type: DataTypes.ENUM("min", "h"),
        defaultValue: "min",
      },

      cantidadTecnicos: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      orden: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "plan_mantenimiento_actividades",
      timestamps: true,
    }
  );

  PlanMantenimientoActividad.associate = (models) => {
    PlanMantenimientoActividad.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "plan",
    });

    PlanMantenimientoActividad.hasMany(models.Adjunto, {
      foreignKey: "planMantenimientoActividadId",
      as: "adjuntos",
      onDelete: "SET NULL",
    });

    PlanMantenimientoActividad.hasMany(models.PlanActividadItem, {
  foreignKey: "actividadId",
  as: "items",
  });
  };

  return PlanMantenimientoActividad;
};