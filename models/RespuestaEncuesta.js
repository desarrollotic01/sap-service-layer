const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RespuestaEncuesta = sequelize.define(
    "RespuestaEncuesta",
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

      token: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      avisoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      respondidoPor: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      correo: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      fechaRespuesta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "RESPONDIDA", "ANULADA"),
        allowNull: false,
        defaultValue: "PENDIENTE",
      },
    },
    {
      tableName: "respuestas_encuesta",
      timestamps: true,
    }
  );

  RespuestaEncuesta.associate = (models) => {
    RespuestaEncuesta.belongsTo(models.Encuesta, {
      foreignKey: "encuestaId",
      as: "encuesta",
    });

    RespuestaEncuesta.hasMany(models.DetalleRespuestaEncuesta, {
      foreignKey: "respuestaEncuestaId",
      as: "detalles",
    });

    if (models.Aviso) {
      RespuestaEncuesta.belongsTo(models.Aviso, {
        foreignKey: "avisoId",
        as: "aviso",
      });
    }
  };

  return RespuestaEncuesta;
};