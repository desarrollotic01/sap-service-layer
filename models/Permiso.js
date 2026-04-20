const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Permiso = sequelize.define(
    "Permiso",
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
      tableName: "Permisos",
      timestamps: true,
    }
  );

  Permiso.associate = (db) => {
    Permiso.belongsToMany(db.Rol, {
      through: "Roles_Permisos",
      foreignKey: "id_permiso",
      otherKey: "id_rol",
      as: "roles",
    });
  };

  return Permiso;
};
