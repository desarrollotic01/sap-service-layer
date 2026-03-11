const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Rubro = sequelize.define(
    "Rubro",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      sapCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Rubros",
      timestamps: true,
    }
  );

  Rubro.associate = (db) => {
    Rubro.hasMany(db.Item, {
      foreignKey: "rubroSapCode",
      sourceKey: "sapCode",
      as: "items",
    });
  };

  return Rubro;
};