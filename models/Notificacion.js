const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notificacion = sequelize.define(
    "Notificacion",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      // ===============================
      // FECHAS
      // ===============================
      fechaInicio: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      fechaFin: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      fechaUltimoMantenimientoPreventivo: {
        type: DataTypes.DATE,
      },

      // ===============================
      // DATOS OPERATIVOS
      // ===============================
      horometro: {
        type: DataTypes.FLOAT,
      },

      numeroMisiones: {
        type: DataTypes.INTEGER,
      },

      numeroEquipo: {
        type: DataTypes.STRING,
      },

      codigoRepuesto: {
        type: DataTypes.STRING,
      },

      // ===============================
      // DESCRIPCIONES
      // ===============================
      descripcionMantenimiento: {
        type: DataTypes.TEXT,
      },

      resumenCorrectivos: {
        type: DataTypes.TEXT,
      },

      descripcionGeneral: {
        type: DataTypes.TEXT,
      },

      observaciones: {
        type: DataTypes.TEXT,
      },

      recomendaciones: {
        type: DataTypes.TEXT,
      },

      // ===============================
      // ESTADO GENERAL DEL EQUIPO
      // ===============================
      estadoGeneralEquipo: {
        type: DataTypes.ENUM(
          "OPERATIVO",
          "INOPERATIVO",
          "OPERATIVO_CON_OBSERVACIONES"
        ),
        allowNull: false,
      },

      // ===============================
      // ESTADO INTERNO NOTIFICACIÓN
      // ===============================
      estado: {
        type: DataTypes.ENUM(
          "BORRADOR",
          "FINALIZADO",
          "APROBADO",
          "RECHAZADO"
        ),
        defaultValue: "BORRADOR",
      },

      // ===============================
      // RELACIONES
      // ===============================
      ordenTrabajoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "notificaciones",
      timestamps: true,
    }
  );

  Notificacion.associate = (models) => {

    // 🔹 Pertenece a una Orden de Trabajo
    Notificacion.belongsTo(models.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    // 🔹 Técnicos que ejecutaron (Muchos a Muchos)
    Notificacion.belongsToMany(models.Trabajador, {
      through: "NotificacionTrabajadores",
      foreignKey: "notificacionId",
      as: "tecnicos",
    });

    // 🔹 Checklist de Planes de Mantenimiento
    Notificacion.hasMany(models.NotificacionPlan, {
      foreignKey: "notificacionId",
      as: "planes",
    });

    // 🔹 Adjuntos (Fotos antes, después, correctivo, acta, informe, etc)
    Notificacion.hasMany(models.Adjunto, {
      foreignKey: "notificacionId",
      as: "adjuntos",
    });
  };

  return Notificacion;
};
