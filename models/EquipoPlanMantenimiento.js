const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EquipoPlanMantenimiento = sequelize.define(
    "EquipoPlanMantenimiento",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      equipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "equipos_planes_mantenimiento",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["equipoId", "planMantenimientoId"],
        },
      ],
    }
  );

  return EquipoPlanMantenimiento;
};
