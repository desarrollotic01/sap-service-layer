const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SolicitudCompraLinea = sequelize.define(
    "SolicitudCompraLinea",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      itemCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      quantity: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },

      warehouseCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      costingCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      projectCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "SolicitudesCompraLineas",
      timestamps: false,
    }
  );

  SolicitudCompraLinea.associate = (db) => {
    SolicitudCompraLinea.belongsTo(db.SolicitudCompra, {
      foreignKey: "solicitud_compra_id",
      as: "solicitud",
    });
  };

  return SolicitudCompraLinea;
};