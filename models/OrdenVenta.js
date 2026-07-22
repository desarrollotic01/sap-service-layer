const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenVenta = sequelize.define(
    "OrdenVenta",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // Código de Proyecto de SAP (módulo Project Management) — Alsud lo usa como Orden de Venta
      codigoProyecto: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      nombreProyecto: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      activoSAP: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "OrdenesVenta",
      timestamps: true,
    }
  );

  return OrdenVenta;
};
