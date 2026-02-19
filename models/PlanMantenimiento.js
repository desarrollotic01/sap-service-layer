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
        type: DataTypes.ENUM(
          "PREVENTIVO",
          "CORRECTIVO",
          "MEJORA",
          "INSPECCION"
        ),
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
    });

    // ✅ relación correcta
    PlanMantenimiento.belongsToMany(models.Equipo, {
      through: models.EquipoPlanMantenimiento,
      foreignKey: "planMantenimientoId",
      otherKey: "equipoId",
      as: "equipos",
    });
  };

  return PlanMantenimiento;
};
