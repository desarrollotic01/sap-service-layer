const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AvisoUbicacion = sequelize.define(
    "AvisoUbicacion",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      avisoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      ubicacionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "AvisoUbicaciones",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["avisoId", "ubicacionId"],
        },
      ],
    }
  );

  AvisoUbicacion.associate = (db) => {
    AvisoUbicacion.belongsTo(db.Aviso, {
      foreignKey: "avisoId",
      as: "aviso",
    });

    AvisoUbicacion.belongsTo(db.UbicacionTecnica, {
      foreignKey: "ubicacionId",
      as: "ubicacion",
    });
  };

  return AvisoUbicacion;
};
