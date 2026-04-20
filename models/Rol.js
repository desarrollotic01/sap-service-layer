const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Rol = sequelize.define(
    "Rol",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "Roles",
      timestamps: true,
    }
  );

  Rol.associate = (db) => {
    Rol.belongsToMany(db.Permiso, {
      through: "Roles_Permisos",
      foreignKey: "id_rol",
      otherKey: "id_permiso",
      as: "permisos",
    });

    Rol.hasMany(db.Usuario, { foreignKey: "id_rol", as: "usuarios" });
  };

  return Rol;
};
