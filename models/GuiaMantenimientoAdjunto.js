const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const GuiaMantenimientoAdjunto = sequelize.define(
    "GuiaMantenimientoAdjunto",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      guiaMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      mime: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      state: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "guias_mantenimiento_adjuntos",
      timestamps: true,
    }
  );

  GuiaMantenimientoAdjunto.associate = (models) => {
    GuiaMantenimientoAdjunto.belongsTo(models.GuiaMantenimiento, {
      foreignKey: "guiaMantenimientoId",
      as: "guia",
    });
  };

  return GuiaMantenimientoAdjunto;
};