const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserViewConfig = sequelize.define(
    "UserViewConfig",
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

      view: {
        type: DataTypes.ENUM("kanban", "lista", "calendario"),
        allowNull: false,
      },

      /* ===== CONFIG VISUAL ===== */
      cardFields: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
      },

      columnOrder: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },

      /* ===== FILTROS ===== */
      filters: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          search: "",
          prioridad: "",
          tipoMantenimiento: "",
          solicitante: "",
        },
      },
    },
    {
      tableName: "user_view_configs",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "view"],
        },
      ],
    }
  );

  return UserViewConfig;
};
