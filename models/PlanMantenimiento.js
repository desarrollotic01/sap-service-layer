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

       contextoObjetivo: {
        type: DataTypes.ENUM("EQUIPO", "UBICACION_TECNICA"),
        allowNull: false,
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

      ubicacionTecnicaObjetivoId: {
        type: DataTypes.UUID,
        allowNull: true,
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

    PlanMantenimiento.belongsTo(models.Equipo, {
      foreignKey: "equipoObjetivoId",
      as: "equipoObjetivo",
    });

    PlanMantenimiento.belongsTo(models.UbicacionTecnica, {
      foreignKey: "ubicacionTecnicaObjetivoId",
      as: "ubicacionTecnicaObjetivo",
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

    PlanMantenimiento.belongsToMany(models.UbicacionTecnica, {
      through: models.UbicacionTecnicaPlanMantenimiento,
      foreignKey: "planMantenimientoId",
      otherKey: "ubicacionTecnicaId",
      as: "ubicacionesTecnicas",
    });

    PlanMantenimiento.hasMany(models.PlanMantenimientoItem, {
      foreignKey: "planMantenimientoId",
      as: "items",
      onDelete: "CASCADE",
      hooks: true,
    });

    PlanMantenimiento.hasMany(models.Adjunto, {
      foreignKey: "planMantenimientoId",
      as: "adjuntos",
      onDelete: "SET NULL",
    });
  };

  return PlanMantenimiento;
};