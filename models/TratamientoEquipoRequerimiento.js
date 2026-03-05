// models/TratamientoEquipoRequerimiento.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoEquipoRequerimiento = sequelize.define(
    "TratamientoEquipoRequerimiento",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      tratamientoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      puestoTrabajo: {
        type: DataTypes.STRING, // o ENUM si ya tienes catálogo fijo
        allowNull: false,
      },

      label: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "tratamiento_equipo_requerimientos",
      timestamps: true,

    }
  );

  TratamientoEquipoRequerimiento.associate = (models) => {
    TratamientoEquipoRequerimiento.belongsTo(models.TratamientoEquipo, {
      foreignKey: "tratamientoEquipoId",
      as: "tratamientoEquipo",
    });
  };

  return TratamientoEquipoRequerimiento;
};