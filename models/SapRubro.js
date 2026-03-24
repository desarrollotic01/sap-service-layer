const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SapRubro = sequelize.define(
    "SapRubro",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "SapRubros",
      timestamps: true,
    }
  );

  return SapRubro;
};