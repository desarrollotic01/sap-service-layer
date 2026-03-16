const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Sede = sequelize.define(
    "Sede",
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
      direccion: {
        type: DataTypes.STRING,
      },
      telefono: {
        type: DataTypes.STRING,
      },
      contacto: {
        type: DataTypes.STRING,
      },
      correo: {
        type: DataTypes.STRING,
      },
      estado: {
        type: DataTypes.ENUM("Activo", "Inactivo"),
        defaultValue: "Activo",
      },
    },
    {
      tableName: "Sedes",
      timestamps: true,
    }
  );

  Sede.associate = (models) => {
    Sede.belongsTo(models.Cliente, {
      foreignKey: "clienteId",
      as: "cliente",
    });

    Sede.hasMany(models.Equipo, {
      foreignKey: "sedeId",
      as: "equipos",
    });

    Sede.hasMany(models.UbicacionTecnica, {
      foreignKey: "sedeId",
      as: "ubicacionesTecnicas",
    });
  };

  return Sede;
};  