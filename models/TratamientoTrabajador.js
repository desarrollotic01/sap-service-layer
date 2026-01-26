
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoTrabajador = sequelize.define(
    "TratamientoTrabajador",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      tratamiento_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      trabajador_id: {
        type: DataTypes.UUID,
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

      // opcional pero útil
      esPrincipal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "TratamientoTrabajadores",
      timestamps: false,
    }
  );

  TratamientoTrabajador.associate = (db) => {
    TratamientoTrabajador.belongsTo(db.Tratamiento, {
      foreignKey: "tratamiento_id",
      as: "tratamiento",
    });

    TratamientoTrabajador.belongsTo(db.Trabajador, {
      foreignKey: "trabajador_id",
      as: "trabajador",
    });
  };

  return TratamientoTrabajador;
};
