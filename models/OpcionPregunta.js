const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OpcionPregunta = sequelize.define(
    "OpcionPregunta",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      preguntaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      textoOpcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      valor: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "opciones_pregunta",
      timestamps: true,
    }
  );

  OpcionPregunta.associate = (models) => {
    OpcionPregunta.belongsTo(models.PreguntaEncuesta, {
      foreignKey: "preguntaId",
      as: "pregunta",
    });

    OpcionPregunta.hasMany(models.DetalleRespuestaEncuesta, {
      foreignKey: "opcionId",
      as: "detallesRespuesta",
    });
  };

  return OpcionPregunta;
};