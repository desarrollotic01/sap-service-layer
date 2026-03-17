const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SolicitudAlmacenLinea = sequelize.define(
    "SolicitudAlmacenLinea",
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
      tableName: "SolicitudesAlmacenLineas",
      timestamps: false,
    }
  );

  SolicitudAlmacenLinea.associate = (db) => {
    SolicitudAlmacenLinea.belongsTo(db.SolicitudAlmacen, {
      foreignKey: "solicitud_almacen_id",
      as: "solicitud",
    });

    SolicitudAlmacenLinea.belongsTo(db.Item, {
      foreignKey: "itemId",
      as: "item",
    });

    SolicitudAlmacenLinea.belongsTo(db.Rubro, {
      foreignKey: "rubroSapCode",
      targetKey: "sapCode",
      as: "rubro",
    });
  };

  return SolicitudAlmacenLinea;
};