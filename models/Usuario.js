const { DataTypes } = require("sequelize");
const argon2 = require("argon2");

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
      usuario: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      contraseña: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      correo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      // Campos de compatibilidad con módulos existentes (avisos, excel, etc.)
      alias: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nombreApellido: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
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
      hooks: {
        beforeCreate: async (usuario) => {
          usuario.contraseña = await argon2.hash(usuario.contraseña);
        },
        beforeUpdate: async (usuario) => {
          if (usuario.changed("contraseña")) {
            usuario.contraseña = await argon2.hash(usuario.contraseña);
          }
        },
      },
    }
  );

  Usuario.associate = (db) => {
    Usuario.hasMany(db.SolicitudCompra, {
      foreignKey: "usuario_id",
      as: "solicitudes",
    });

    Usuario.belongsTo(db.Rol, {
      foreignKey: { name: "id_rol", allowNull: true },
      as: "rol",
    });
  };

  return Usuario;
};
