const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Equipo = sequelize.define(
    "Equipo",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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

      clienteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },  

 
      id_cliente: {
        type: DataTypes.STRING,
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

      status: {
        type: DataTypes.ENUM("Entregado", "En compra", "Almacen"),
        defaultValue: "Almacen",
      },

      idPlaca: {
        type: DataTypes.STRING,
      },

      // 🔄 CAMBIADO
      nombre: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },

      descripcion: {
        type: DataTypes.TEXT,
      },

      marca: {
        type: DataTypes.STRING,
      },

      modelo: {
        type: DataTypes.STRING,
      },

      serie: {
        type: DataTypes.STRING,
        unique: true,
      },

      // ✅ NUEVO: tipo de equipo (propiedad)
      tipoEquipoPropiedad: {
        type: DataTypes.ENUM("Vendido", "Propio", "Atendido"),
        allowNull: false,
      },

      // ✅ NUEVO: país por código (escalable)
     paisId: {
  type: DataTypes.UUID,
  allowNull: false,
},

      fechaEntregaPrevista: {
        type: DataTypes.DATEONLY,
      },

      fechaEntregaReal: {
        type: DataTypes.DATEONLY,
      },

      estado: {
        type: DataTypes.ENUM(
          "Operativo",
          "Inoperativo",
          "No instalado"
        ),
        defaultValue: "No instalado",
      },

      finGarantia: {
        type: DataTypes.DATEONLY,
      },

      familiaId: {
        type: DataTypes.UUID,
      },

      tipoEquipo: {
        type: DataTypes.STRING,
      },

      linea: {
        type: DataTypes.ENUM(
          "Acceso",
          "Autosat",
          "Vehiculos",
          "Otros"
        ),
      },

      lineaOtroTexto: {
        type: DataTypes.STRING,
      },

      codigo: {
        type: DataTypes.STRING,
        unique: true,
      },

      creadoPor: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "Equipos",
      timestamps: true,
    }
  );

  Equipo.associate = (models) => {
    Equipo.belongsTo(models.Cliente, {
      foreignKey: "clienteId",
      as: "cliente",
    });

    Equipo.belongsTo(models.Familia, {
      foreignKey: "familiaId",
      as: "familia",
    }); 

    Equipo.hasMany(models.Adjunto, {
      foreignKey: "equipoId",
      as: "adjuntos",
    });

    Equipo.belongsTo(models.Pais, {
  foreignKey: "paisId",
  as: "pais",
});

Equipo.hasMany(models.OrdenTrabajoEquipo, {
  foreignKey: "equipoId",
  as: "ordenesTrabajoEquipos",
});

Equipo.belongsToMany(models.PlanMantenimiento, {
  through: models.EquipoPlanMantenimiento,
  foreignKey: "equipoId",
  otherKey: "planMantenimientoId",
  as: "planesMantenimiento",
});


  };

  return Equipo;
};
