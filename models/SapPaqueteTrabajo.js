const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SapPaqueteTrabajo = sequelize.define(
    "SapPaqueteTrabajo",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // 🔥 importante (5.1, 1.2, etc)
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
      tableName: "SapPaquetesTrabajo",
      timestamps: true,
    }
  );

  return SapPaqueteTrabajo;
};