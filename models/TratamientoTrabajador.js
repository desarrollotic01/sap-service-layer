
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
          "tecnico_electrico",
          "operario_de_mantenimiento",
          "tecnico_mecanico",
          "supervisor",
          "analista_de_mantenimiento",
          "programador_de_mantenimiento",
          "coordinador_de_mantenimiento"
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
