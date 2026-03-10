const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UbicacionTecnica = sequelize.define(
    "UbicacionTecnica",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      codigo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },

      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      id_cliente: {
        type: DataTypes.STRING,
      },

      clienteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      tipoEquipoPropiedad: {
        type: DataTypes.ENUM("Vendido", "Propio", "Atendido"),
        allowNull: false,
      },

      paisId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      sede: {
        type: DataTypes.STRING,
      },

      almacen: {
        type: DataTypes.STRING,
      },

      operadorLogistico: {
        type: DataTypes.STRING,
      },

      idPlaca: {
        type: DataTypes.STRING,
      },

      numeroOV: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      fechaOV: {
        type: DataTypes.DATEONLY,
      },

      numeroOrdenCliente: {
        type: DataTypes.STRING,
      },

      fechaOrdenCliente: {
        type: DataTypes.DATEONLY,
      },

      descripcion: {
        type: DataTypes.STRING,
      },

      fechaEntregaPrevista: {
        type: DataTypes.DATEONLY,
      },

      fechaEntregaReal: {
        type: DataTypes.DATEONLY,
      },

      finGarantia: {
        type: DataTypes.DATEONLY,
      },

      especialidad: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "UbicacionesTecnicas",
      timestamps: true,
    }
  );

  UbicacionTecnica.associate = (models) => {
    UbicacionTecnica.hasMany(models.AvisoUbicacion, {
      foreignKey: "ubicacionId",
      as: "avisosRelacion",
    });

    UbicacionTecnica.belongsTo(models.Pais, {
      foreignKey: "paisId",
      as: "pais",
    });

    UbicacionTecnica.belongsTo(models.Cliente, {
      foreignKey: "clienteId",
      as: "cliente",
    });

    UbicacionTecnica.belongsToMany(models.PlanMantenimiento, {
      through: models.UbicacionTecnicaPlanMantenimiento,
      foreignKey: "ubicacionTecnicaId",
      otherKey: "planMantenimientoId",
      as: "planesMantenimiento",
    });

    UbicacionTecnica.hasMany(models.PlanMantenimiento, {
      foreignKey: "ubicacionTecnicaObjetivoId",
      as: "planesComoObjetivo",
    });
  };

  return UbicacionTecnica;
};