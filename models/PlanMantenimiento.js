const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlanMantenimiento = sequelize.define(
    "PlanMantenimiento",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      codigoPlan: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      familiaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      tipoEquipo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      modeloEquipo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      tipo: {
        type: DataTypes.ENUM("PREVENTIVO", "CORRECTIVO", "MEJORA", "INSPECCION"),
        allowNull: false,
      },

      esEspecifico: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      equipoObjetivoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ✅ FRECUENCIA GENERAL DEL PLAN
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

      // ✅ Solo si frecuencia = POR_HORA
      frecuenciaHoras: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ✅ activar/desactivar plan
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "planes_mantenimiento",
      timestamps: true,
    }
  );

  PlanMantenimiento.associate = (models) => {
    PlanMantenimiento.belongsTo(models.Familia, {
      foreignKey: "familiaId",
      as: "familia",
    });

    PlanMantenimiento.hasMany(models.PlanMantenimientoActividad, {
      foreignKey: "planMantenimientoId",
      as: "actividades",
      onDelete: "CASCADE",
      hooks: true,
    });

    PlanMantenimiento.belongsToMany(models.Equipo, {
      through: models.EquipoPlanMantenimiento,
      foreignKey: "planMantenimientoId",
      otherKey: "equipoId",
      as: "equipos",
    });

    // ✅ Items generales del plan (tipo solicitud)
    PlanMantenimiento.hasMany(models.PlanMantenimientoItem, {
      foreignKey: "planMantenimientoId",
      as: "items",
      onDelete: "CASCADE",
      hooks: true,
    });

    // ✅ Adjuntos generales del plan
    PlanMantenimiento.hasMany(models.Adjunto, {
      foreignKey: "planMantenimientoId",
      as: "adjuntos",
      onDelete: "SET NULL",
    });
  };

  return PlanMantenimiento;
};