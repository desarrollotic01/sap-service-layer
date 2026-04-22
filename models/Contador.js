const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Contador",
    {
      clave: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      valor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "contadores",
      timestamps: false,
    }
  );
};
