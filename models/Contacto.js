const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Contacto = sequelize.define(
    "Contacto",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      clienteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      correo: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      telefono: {
        type: DataTypes.STRING,
      },

      cargo: {
        type: DataTypes.STRING,
      },

      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Contactos",
      timestamps: true,
    }
  );

  Contacto.associate = (db) => {
    Contacto.belongsTo(db.Cliente, {
      foreignKey: "clienteId",
      as: "cliente",
    });
  };

  return Contacto;
};
