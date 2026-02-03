
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AvisoEquipo = sequelize.define(
    "AvisoEquipo",
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

      equipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "AvisoEquipos",
      timestamps: false,

      
      indexes: [
        {
          unique: true,
          fields: ["avisoId", "equipoId"],
        },
      ],
    }
  );

  AvisoEquipo.associate = (db) => {
  AvisoEquipo.belongsTo(db.Aviso, {
    foreignKey: "avisoId",
    as: "aviso", // opcional pero recomendado
  });

  AvisoEquipo.belongsTo(db.Equipo, {
    foreignKey: "equipoId",
    as: "equipo", // 🔥 ESTE FALTABA
  });
};


  return AvisoEquipo;
};
