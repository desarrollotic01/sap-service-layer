const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    "Usuario",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      nombreApellido: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      alias: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      state: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "Usuarios",
      timestamps: true,
    }
  );

  Usuario.associate = (db) => {
    Usuario.hasMany(db.SolicitudCompra, {
      foreignKey: "usuario_id",
      as: "solicitudes",
    });
  };

  return Usuario;
};