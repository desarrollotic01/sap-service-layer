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

      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      itemCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      description: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: "",
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

      rubroSapCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      paqueteTrabajo: {
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

    SolicitudCompraLinea.belongsTo(db.Item, {
      foreignKey: "itemId",
      as: "item",
    });

    SolicitudCompraLinea.belongsTo(db.Rubro, {
      foreignKey: "rubroSapCode",
      targetKey: "sapCode",
      as: "rubro",
    });
  };

  return SolicitudCompraLinea;
};