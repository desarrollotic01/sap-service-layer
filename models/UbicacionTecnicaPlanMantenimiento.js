const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UbicacionTecnicaPlanMantenimiento = sequelize.define(
    "UbicacionTecnicaPlanMantenimiento",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      ubicacionTecnicaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "ubicaciones_tecnicas_planes_mantenimiento",
      timestamps: true,
    }
  );

  return UbicacionTecnicaPlanMantenimiento;
};