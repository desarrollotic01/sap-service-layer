const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoEquipo = sequelize.define(
    "TratamientoEquipo",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      tratamientoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // 🔧 Puede ser equipo o ubicación técnica
      equipoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      ubicacionTecnicaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // 📋 descripción del trabajo en ese equipo
      descripcionEquipo: {
        type: DataTypes.TEXT,
      },

      // 🔗 plan aplicado (solo preventivo)
      planMantenimientoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      prioridad: {
        type: DataTypes.ENUM(
          "BAJA",
          "MEDIA",
          "ALTA",
          "CRITICA"
        ),
        defaultValue: "MEDIA",
      },

      estado: {
        type: DataTypes.ENUM(
          "PENDIENTE",
          "PLANIFICADO",
          "LISTO",
          "CANCELADO"
        ),
        defaultValue: "PENDIENTE",
      },

      observaciones: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "tratamiento_equipos",
      timestamps: true,

    }
  );

  TratamientoEquipo.associate = (models) => {
    TratamientoEquipo.belongsTo(models.Tratamiento, {
      foreignKey: "tratamientoId",
      as: "tratamiento",
    });

    TratamientoEquipo.belongsTo(models.Equipo, {
      foreignKey: "equipoId",
      as: "equipo",
    });

    TratamientoEquipo.belongsTo(models.PlanMantenimiento, {
      foreignKey: "planMantenimientoId",
      as: "planMantenimiento",
    });

    // 🔥 actividades planificadas
    TratamientoEquipo.hasMany(models.TratamientoEquipoActividad, {
      foreignKey: "tratamientoEquipoId",
      as: "actividades",
    });

    TratamientoEquipo.hasMany(models.TratamientoEquipoRequerimiento, {
  foreignKey: "tratamientoEquipoId",
  as: "requerimientos",
});

TratamientoEquipo.hasMany(models.TratamientoEquipoTrabajador, {
  foreignKey: "tratamientoEquipoId",
  as: "tecnicosAsignados",
});


TratamientoEquipo.belongsTo(models.UbicacionTecnica, {
  foreignKey: "ubicacionTecnicaId",
  as: "ubicacionTecnica",
});

  };

  return TratamientoEquipo;
};