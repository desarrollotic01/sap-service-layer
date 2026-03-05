const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {
  const GuiaMantenimiento = sequelize.define(
    "GuiaMantenimiento",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      // ✅ Siempre preventivo
      tipoMantenimiento: {
        type: DataTypes.ENUM("Preventivo"),
        allowNull: false,
        defaultValue: "Preventivo",
      },


      estadoGuia: {
        type: DataTypes.ENUM(
          "creado",
          "tratado",
          "con OT",
          "rechazado",
          "finalizado",
          "finalizado sin facturacion",        ),
        defaultValue: "creado",
      },

      // ✅ Selección: Equipo O Ubicación Técnica (uno obligatorio)
      equipoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      ubicacionTecnicaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ✅ Plan de mantenimiento (vinculado a equipo/ubicación por tu lógica)
      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ✅ Periodo propio de la guía
      periodo: {
        type: DataTypes.ENUM(
          "DIARIO",
          "SEMANAL",
          "MENSUAL",
          "BIMESTRAL",
          "TRIMESTRAL",
          "SEIS_MESES",
          "ANUAL",
          "CINCO_ANIOS",
          "DIEZ_ANIOS"
        ),
        allowNull: false,
      },

      periodoActivo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // ✅ Orden de venta
      ordenVenta: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ✅ Numero de Alerta automático: 578465AL001
      numeroAlerta: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      // ✅ País (tabla existente)
      paisId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ✅ Criticidad (se carga del equipo)
      creticidad: {
        type: DataTypes.ENUM("A", "B", "C"),
        allowNull: false,
      },

      // ✅ Fecha inicio de alerta
      fechaInicioAlerta: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      // ✅ Solicitante (usuario que crea)
      solicitanteId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ✅ Producto (automático por equipo) - snapshot
      producto: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      descripcionDetallada: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      state: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "guias_mantenimiento",
      timestamps: true,
    }
  );

  // ✅ ASOCIACIONES estilo tu modelo
  GuiaMantenimiento.associate = (models) => {
    GuiaMantenimiento.belongsTo(models.Equipo, {
      foreignKey: "equipoId",
      as: "equipo",
    });

    GuiaMantenimiento.belongsTo(models.UbicacionTecnica, {
      foreignKey: "ubicacionTecnicaId",
      as: "ubicacionTecnica",
    });

    GuiaMantenimiento.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "planMantenimiento",
    });

    GuiaMantenimiento.belongsTo(models.Pais, {
      foreignKey: "paisId",
      as: "pais",
    });

    GuiaMantenimiento.belongsTo(models.Usuario, {
      foreignKey: "solicitanteId",
      as: "solicitante",
    });

    GuiaMantenimiento.hasMany(models.GuiaMantenimientoAdjunto, {
      foreignKey: "guiaMantenimientoId",
      as: "adjuntos",
    });


    GuiaMantenimiento.hasMany(models.GuiaMantenimientoProgramacion, {
  foreignKey: "guiaMantenimientoId",
  as: "programaciones",
});
  };

  return GuiaMantenimiento;
};