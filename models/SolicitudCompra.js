const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SolicitudCompra = sequelize.define(
    "SolicitudCompra",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      requiredDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      estado: {
        type: DataTypes.STRING,
        defaultValue: "DRAFT",
      },

      sapDocNum: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
department: {
  type: DataTypes.STRING,
  allowNull: true,
},

comments: {
  type: DataTypes.TEXT,
  allowNull: true,
},

docCurrency: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: "PEN",
},

docRate: {
  type: DataTypes.DECIMAL(15,6),
  allowNull: false,
  defaultValue: 1,
},
    },
    {
      tableName: "SolicitudesCompra",
      timestamps: true,
    }
  );

  SolicitudCompra.associate = (db) => {
    SolicitudCompra.belongsTo(db.Usuario, {
      foreignKey: "usuario_id",
      as: "usuario",
    });

    SolicitudCompra.hasMany(db.SolicitudCompraLinea, {
      foreignKey: "solicitud_compra_id",
      as: "lineas",
    });
  };

  return SolicitudCompra;
};
