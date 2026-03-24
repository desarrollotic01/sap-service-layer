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

      rubroId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      paqueteTrabajoId: {
        type: DataTypes.UUID,
        allowNull: false,
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

    SolicitudCompraLinea.belongsTo(db.SapPaqueteTrabajo, {
  foreignKey: "paqueteTrabajoId",
  as: "paqueteTrabajo",
});

SolicitudCompraLinea.belongsTo(db.SapRubro, {
  foreignKey: "rubroId",
  as: "rubro",
});
  };

  return SolicitudCompraLinea;
};