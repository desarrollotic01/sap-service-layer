const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Encuesta = sequelize.define(
    "Encuesta",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      titulo: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "encuestas",
      timestamps: true,
    }
  );

  Encuesta.associate = (models) => {
    Encuesta.hasMany(models.PreguntaEncuesta, {
      foreignKey: "encuestaId",
      as: "preguntas",
    });

    Encuesta.hasMany(models.RespuestaEncuesta, {
      foreignKey: "encuestaId",
      as: "respuestas",
    });
  };

  return Encuesta;
};