const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenTrabajoEquipoTrabajador = sequelize.define(
    "OrdenTrabajoEquipoTrabajador",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      ordenTrabajoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      trabajadorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      esEncargado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "orden_trabajo_equipo_trabajadores",
      timestamps: true
     
    }
  );

  OrdenTrabajoEquipoTrabajador.associate = (models) => {
    OrdenTrabajoEquipoTrabajador.belongsTo(models.OrdenTrabajoEquipo, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "ordenTrabajoEquipo",
    });

    OrdenTrabajoEquipoTrabajador.belongsTo(models.Trabajador, {
      foreignKey: "trabajadorId",
      as: "trabajador",
    });
  };

  return OrdenTrabajoEquipoTrabajador;
};
