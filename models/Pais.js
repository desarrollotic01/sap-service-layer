const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Pais = sequelize.define(
    "Pais",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      codigo: {
        type: DataTypes.STRING(3),
        allowNull: false,
        unique: true,
      },

      nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Paises",
      timestamps: true,
    }
  );

  Pais.associate = (models) => {
    Pais.hasMany(models.Equipo, {
      foreignKey: "paisId",
      as: "equipos",
    });
  };

  return Pais;
};
