const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UbicacionTecnica = sequelize.define(
    "UbicacionTecnica",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      codigo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      descripcion: {
        type: DataTypes.STRING,
      },

      nivel: {
        type: DataTypes.STRING,
      },

      ubicacionPadre: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "UbicacionesTecnicas",
      timestamps: true,
    }
  );

  return UbicacionTecnica;
};
