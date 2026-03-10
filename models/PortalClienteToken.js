const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PortalClienteToken = sequelize.define(
    "PortalClienteToken",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      clienteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      expiraEn: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      ultimoUso: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "portal_cliente_tokens",
      timestamps: true,
    }
  );

  PortalClienteToken.associate = (models) => {
    PortalClienteToken.belongsTo(models.Cliente, {
      foreignKey: "clienteId",
      as: "cliente",
    });
  };

  return PortalClienteToken;
};