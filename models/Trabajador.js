// models/Trabajador.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Trabajador = sequelize.define(
    "Trabajador",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      rol: {
        type: DataTypes.ENUM(
          "electrico",
          "mantenimiento",
          "mecanico"
        ),
        allowNull: false,
      },

      empresa: {
        type: DataTypes.STRING,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Trabajadores",
      timestamps: true,
    }
  );

  return Trabajador;
};
