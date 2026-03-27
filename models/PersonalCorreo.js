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

   SolicitudAlmacenLinea.belongsTo(db.SapPaqueteTrabajo, {
  foreignKey: "paqueteTrabajoId",
  as: "paqueteTrabajo",
});

SolicitudAlmacenLinea.belongsTo(db.SapRubro, {
  foreignKey: "rubroId",
  as: "rubro",
});
  };

  return SolicitudAlmacenLinea;
};