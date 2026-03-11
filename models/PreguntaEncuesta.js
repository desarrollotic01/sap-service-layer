const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PreguntaEncuesta = sequelize.define(
    "PreguntaEncuesta",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      encuestaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      textoPregunta: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      tipoPregunta: {
        type: DataTypes.ENUM(
          "TEXTO",
          "TEXTAREA",
          "OPCION_UNICA",
          "OPCION_MULTIPLE",
          "NUMERO",
          "FECHA"
        ),
        allowNull: false,
      },

      orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      requerida: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "preguntas_encuesta",
      timestamps: true,
    }
  );

  PreguntaEncuesta.associate = (models) => {
    PreguntaEncuesta.belongsTo(models.Encuesta, {
      foreignKey: "encuestaId",
      as: "encuesta",
    });

    PreguntaEncuesta.hasMany(models.OpcionPregunta, {
      foreignKey: "preguntaId",
      as: "opciones",
    });

    PreguntaEncuesta.hasMany(models.DetalleRespuestaEncuesta, {
      foreignKey: "preguntaId",
      as: "detallesRespuesta",
    });
  };

  return PreguntaEncuesta;
};