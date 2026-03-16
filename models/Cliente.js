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

      sapCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      razonSocial: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      ruc: {
        type: DataTypes.STRING,
      },

      direccion: {
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

      activoSAP: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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

    Cliente.hasMany(db.Equipo, {
      foreignKey: "clienteId",
      as: "equipos",
    });

    Cliente.hasMany(db.Sede, {
      foreignKey: "clienteId",
      as: "sedes",
    });

Cliente.hasMany(db.PortalClienteToken, {
  foreignKey: "clienteId",
  as: "portalTokens",
});

Cliente.hasMany(db.UbicacionTecnica, {
  foreignKey: "clienteId",
  as: "ubicacionesTecnicas"
});


  };

  return Cliente;
};