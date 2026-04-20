const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExcelConfig = sequelize.define(
    "ExcelConfig",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      modulo: {
        type: DataTypes.ENUM(
          "aviso",
          "ordenTrabajo",
          "equipo",
          "ubicacionTecnica",
          "guiaMantenimiento",
          "planMantenimiento"
        ),
        allowNull: false,
      },

      // Campos seleccionados por hoja: { principal: ["campo1", "campo2"], actividades: [...] }
      campos: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },

      // Filtros aplicados al exportar
      filters: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: "excel_configs",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "modulo"],
        },
      ],
    }
  );

  return ExcelConfig;
};
