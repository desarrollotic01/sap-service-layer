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

      department: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      emailSolicitante: {
        type: DataTypes.STRING,
        allowNull: false,
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
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        defaultValue: 1,
      },

      bplId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      estado: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "DRAFT",
      },

      sapDocNum: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "SolicitudesCompra",
      timestamps: true,
    }
  );

  SolicitudCompra.associate = (db) => {
    SolicitudCompra.hasMany(db.SolicitudCompraLinea, {
      foreignKey: "solicitud_compra_id",
      as: "lineas",
    });
  };

  return SolicitudCompra;
};