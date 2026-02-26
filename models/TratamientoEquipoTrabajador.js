// models/TratamientoEquipoTrabajador.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoEquipoTrabajador = sequelize.define(
    "TratamientoEquipoTrabajador",
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

      trabajadorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      puestoTrabajo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("ASIGNADO", "CONFIRMADO", "REMOVIDO"),
        defaultValue: "ASIGNADO",
      },
    },
    {
      tableName: "tratamiento_equipo_trabajadores",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["tratamientoEquipoId", "trabajadorId"] },
      ],
    }
  );

  TratamientoEquipoTrabajador.associate = (models) => {
    TratamientoEquipoTrabajador.belongsTo(models.TratamientoEquipo, {
      foreignKey: "tratamientoEquipoId",
      as: "tratamientoEquipo",
    });

    TratamientoEquipoTrabajador.belongsTo(models.Trabajador, {
      foreignKey: "trabajadorId",
      as: "trabajador",
    });
  };

  return TratamientoEquipoTrabajador;
};