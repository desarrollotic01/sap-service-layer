const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const GuiaMantenimientoProgramacion = sequelize.define(
    "GuiaMantenimientoProgramacion",
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

      fechaProgramada: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "EJECUTADO", "CANCELADO", "VENCIDO"),
        allowNull: false,
        defaultValue: "PENDIENTE",
      },

      fechaEjecucionReal: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      comentario: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      usuarioIdAccion: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      state: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "guias_mantenimiento_programaciones",
      timestamps: true,
    }
  );

  GuiaMantenimientoProgramacion.associate = (models) => {
    GuiaMantenimientoProgramacion.belongsTo(models.GuiaMantenimiento, {
      foreignKey: "guiaMantenimientoId",
      as: "guia",
    });

    // opcional (si quieres guardar el usuario que ejecuta/cancela)
    GuiaMantenimientoProgramacion.belongsTo(models.Usuario, {
      foreignKey: "usuarioIdAccion",
      as: "usuarioAccion",
    });
  };

  return GuiaMantenimientoProgramacion;
};