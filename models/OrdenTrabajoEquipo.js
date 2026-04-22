const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrdenTrabajoEquipo = sequelize.define(
    "OrdenTrabajoEquipo",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      ordenTrabajoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ✅ ahora puede ser null porque también puede venir una ubicación técnica
      equipoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ✅ NUEVO
      ubicacionTecnicaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      descripcionEquipo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      prioridad: {
        type: DataTypes.ENUM("BAJA", "MEDIA", "ALTA", "CRITICA"),
        defaultValue: "MEDIA",
      },

      fechaInicioProgramada: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      fechaFinProgramada: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      fechaInicioReal: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      fechaFinReal: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      observacionesEquipo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      estadoEquipo: {
        type: DataTypes.ENUM(
          "PENDIENTE",
          "EN_PROCESO",
          "FINALIZADO",
          "CANCELADO"
        ),
        defaultValue: "PENDIENTE",
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "orden_trabajo_equipos",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["ordenTrabajoId", "equipoId"],
          where: {
            equipoId: {
              [sequelize.Sequelize.Op.ne]: null,
            },
          },
        },
        {
          unique: true,
          fields: ["ordenTrabajoId", "ubicacionTecnicaId"],
          where: {
            ubicacionTecnicaId: {
              [sequelize.Sequelize.Op.ne]: null,
            },
          },
        },
      ],
      validate: {
        soloUnTarget() {
          const tieneEquipo = !!this.equipoId;
          const tieneUbicacion = !!this.ubicacionTecnicaId;
          // Allow both null (general entry for instalación avisos)
          if (tieneEquipo && tieneUbicacion) {
            throw new Error(
              "No puede tener equipoId y ubicacionTecnicaId a la vez"
            );
          }
        },
      },
    }
  );

  OrdenTrabajoEquipo.associate = (models) => {
    OrdenTrabajoEquipo.belongsTo(models.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    OrdenTrabajoEquipo.belongsTo(models.Equipo, {
      foreignKey: "equipoId",
      as: "equipo",
    });

    OrdenTrabajoEquipo.belongsTo(models.UbicacionTecnica, {
      foreignKey: "ubicacionTecnicaId",
      as: "ubicacionTecnica",
    });

    OrdenTrabajoEquipo.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "planMantenimiento",
    });

    OrdenTrabajoEquipo.hasMany(models.Adjunto, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "adjuntos",
    });

    OrdenTrabajoEquipo.hasMany(models.OrdenTrabajoEquipoTrabajador, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "trabajadores",
    });

    OrdenTrabajoEquipo.hasMany(models.OrdenTrabajoEquipoActividad, {
      foreignKey: "ordenTrabajoEquipoId",
      as: "actividades",
    });
  };

  return OrdenTrabajoEquipo;
};