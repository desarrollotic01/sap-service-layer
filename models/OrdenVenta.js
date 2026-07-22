const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenVenta = sequelize.define(
    "OrdenVenta",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      sapDocEntry: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },

      docNum: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      cardCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      cardName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      docDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      docTotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },

      activoSAP: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "OrdenesVenta",
      timestamps: true,
    }
  );

  return OrdenVenta;
};
