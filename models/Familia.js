const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Familia = sequelize.define(
    "Familia",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      descripcion: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "Familias",
      timestamps: true,
    }
  );

  Familia.associate = (models) => {
    Familia.hasMany(models.Equipo, {
      foreignKey: "familiaId",
      as: "equipos",
    });
  };

  return Familia;
};
