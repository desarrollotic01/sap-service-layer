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

      recurso: {
        type: DataTypes.ENUM("MATERIAL", "MANO_OBRA", "SERVICIO"),
        allowNull: false,
      },

      item: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      itemCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      unidad: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      cantidad: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1,
      },

      observacion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "plan_actividad_items",
      timestamps: true,
    }
  );

  PlanActividadItem.associate = (models) => {
    PlanActividadItem.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "actividadId",
      as: "actividad",
    });
  };

  return PlanActividadItem;
};