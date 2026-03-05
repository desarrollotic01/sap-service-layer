const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlanMantenimientoItem = sequelize.define(
    "PlanMantenimientoItem",
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

      itemCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      quantity: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 1,
      },

      warehouseCode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "01",
      },

      costingCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      projectCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      rubro: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      paqueteTrabajo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      observacion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "PlanMantenimientoItems",
      timestamps: true,
    }
  );

  PlanMantenimientoItem.associate = (models) => {
    PlanMantenimientoItem.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "plan",
    });
  };

  return PlanMantenimientoItem;
};