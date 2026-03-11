const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DetalleRespuestaEncuesta = sequelize.define(
    "DetalleRespuestaEncuesta",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      respuestaEncuestaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      preguntaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      opcionId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      respuestaTexto: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      respuestaNumero: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      respuestaFecha: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "detalle_respuestas_encuesta",
      timestamps: true,
    }
  );

  DetalleRespuestaEncuesta.associate = (models) => {
    DetalleRespuestaEncuesta.belongsTo(models.RespuestaEncuesta, {
      foreignKey: "respuestaEncuestaId",
      as: "respuestaEncuesta",
    });

    DetalleRespuestaEncuesta.belongsTo(models.PreguntaEncuesta, {
      foreignKey: "preguntaId",
      as: "pregunta",
    });

    DetalleRespuestaEncuesta.belongsTo(models.OpcionPregunta, {
      foreignKey: "opcionId",
      as: "opcion",
    });
  };

  return DetalleRespuestaEncuesta;
};