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

      // 🧍 DATOS PERSONALES
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      apellido: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      dni: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    notEmpty: true,
    len: [7, 12],
  },
},

      fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // 📍 UBICACIÓN
      zona: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      direccion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 🧰 DATOS LABORALES
      rol: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      
      empresa: {
        type: DataTypes.STRING,
        allowNull: true,
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
