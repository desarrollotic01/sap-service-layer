const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlanActividadItem = sequelize.define(
    "PlanActividadItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      actividadId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
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

      rubroSapCode: {
        type: DataTypes.INTEGER,
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
      tableName: "PlanActividadItems",
      timestamps: true,
    }
  );

  PlanActividadItem.associate = (models) => {
    PlanActividadItem.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "actividadId",
      as: "actividad",
    });

    PlanActividadItem.belongsTo(models.Item, {
      foreignKey: "itemId",
      as: "item",
    });

    PlanActividadItem.belongsTo(models.Rubro, {
      foreignKey: "rubroSapCode",
      targetKey: "sapCode",
      as: "rubro",
    });
  };

  return PlanActividadItem;
};