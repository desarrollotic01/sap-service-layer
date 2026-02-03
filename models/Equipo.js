const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Equipo = sequelize.define(
    "Equipo",
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

      tipo: {
        type: DataTypes.STRING,
      },

      marca: {
        type: DataTypes.STRING,
      },

      ubicacionTecnica: {
        type: DataTypes.STRING,
      },

      estado: {
        type: DataTypes.ENUM("Activo", "Inactivo"),
        defaultValue: "Activo",
      },
    },
    {
      tableName: "Equipos",
      timestamps: true,
    }
  );


 Equipo.associate = (db) => {
    Equipo.hasMany(db.AvisoEquipo, {
      foreignKey: "equipoId",
      as: "avisosRelacion",
    });
  };


  return Equipo;
};
