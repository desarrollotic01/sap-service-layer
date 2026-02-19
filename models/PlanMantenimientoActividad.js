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

      // ✅ CÓDIGO FUNCIONAL
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

      // 🔧 Tipo de trabajo REAL
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

      // 👷 Rol requerido
      rolTecnico: {
        type: DataTypes.ENUM(
          "tecnico_electrico",
          "tecnico_mecanico",
          "supervisor",
          "externo"
        ),
        allowNull: false,
      },

      frecuencia: {
        type: DataTypes.ENUM(
          "POR_HORA",
          "DIARIA",
          "SEMANAL",
          "QUINCENAL",
          "MENSUAL",
          "TRIMESTRAL",
          "SEMESTRAL",
          "ANUAL",
          "BIENAL",
          "QUINQUENAL"
        ),
        allowNull: false,
      },

      frecuenciaHoras: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      duracionMinutos: DataTypes.INTEGER,

      unidadDuracion: {
        type: DataTypes.ENUM("min", "h"),
        defaultValue: "min",
      },

      cantidadTecnicos: DataTypes.INTEGER,
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

    PlanMantenimientoActividad.hasMany(models.PlanActividadItem, {
      foreignKey: "actividadId",
      as: "items",
    });

    PlanMantenimientoActividad.hasMany(models.Adjunto, {
      foreignKey: "planMantenimientoActividadId",
      as: "adjuntos",
    });
  };

  return PlanMantenimientoActividad;
};
