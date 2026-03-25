const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Item = sequelize.define(
    "Item",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      sapCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      rubroSapCode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      rubroNombre: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      unidadCompra: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      unidadInventario: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      unidadVenta: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      activoSAP: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

    
    },
    {
      tableName: "Items",
      timestamps: true,
    }
  );

  Item.associate = (db) => {
    Item.hasMany(db.SolicitudCompraLinea, {
      foreignKey: "itemId",
      as: "solicitudLineas",
    });

    Item.belongsTo(db.Rubro, {
      foreignKey: "rubroSapCode",
      targetKey: "sapCode",
      as: "rubro",
    });
  };

  return Item;
};