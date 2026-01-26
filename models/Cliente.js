const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Cliente = sequelize.define(
    "Cliente",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      razonSocial: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      ruc: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      direccion: {
        type: DataTypes.STRING,
      },

      contacto: {
        type: DataTypes.STRING,
      },

      telefono: {
        type: DataTypes.STRING,
      },

      correo: {
        type: DataTypes.STRING,
      },

      tipoCliente: {
        type: DataTypes.STRING,
      },

      estado: {
        type: DataTypes.ENUM("Activo", "Inactivo"),
        defaultValue: "Activo",
      },
    
    },
    {
      tableName: "Clientes",
      timestamps: true,
    }
  );

  Cliente.associate = (db) => {
  Cliente.hasMany(db.Contacto, {
    foreignKey: "clienteId",
    as: "contactos",
  });
};

  return Cliente;
};
