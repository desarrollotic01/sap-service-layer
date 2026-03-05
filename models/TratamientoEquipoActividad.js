// models/TratamientoEquipoActividad.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TratamientoEquipoActividad = sequelize.define(
    "TratamientoEquipoActividad",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      tratamientoEquipoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // 🔗 referencia al plan (si viene de plan)
      planMantenimientoActividadId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ✅ Igual que PlanMantenimientoActividad
      codigoActividad: {
        type: DataTypes.STRING,
        allowNull: true, // en MANUAL puede ser null
      },

      sistema: { type: DataTypes.STRING, allowNull: true },
      subsistema: { type: DataTypes.STRING, allowNull: true },
      componente: { type: DataTypes.STRING, allowNull: true },

      tarea: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      tipoTrabajo: {
        type: DataTypes.ENUM(
          "TORQUEO_REGULACION",
          "APLICACION",
          "REVISION",
          "INSPECCION",
          "CAMBIO",
          "LIMPIEZA",
          "AJUSTE",
          "LUBRICACION",
          "REPARACION"
        ),
        allowNull: true, // preventivo lo trae el plan; correctivo lo define usuario
      },

      // ✅ NUEVO (para igualarlo al plan)
      rolTecnico: {
        type: DataTypes.ENUM(
          "tecnico_electrico",
          "operario_de_mantenimiento",
          "tecnico_mecanico",
          "supervisor"
        ),
        allowNull: true, // PLAN lo trae; MANUAL lo define usuario
      },

      // ✅ NUEVO (editable)
      cantidadTecnicos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1 },
      },

      // ✅ Editable (valor tal cual lo pone el usuario)
      duracionEstimadaValor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      // ✅ Editable
      unidadDuracion: {
        type: DataTypes.ENUM("min", "h"),
        allowNull: false,
        defaultValue: "min",
      },

      // ✅ estándar en minutos (para reportes)
      duracionEstimadaMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      estado: {
        type: DataTypes.ENUM("PENDIENTE", "LISTA", "OMITIDA"),
        defaultValue: "PENDIENTE",
      },

      origen: {
        type: DataTypes.ENUM("PLAN", "MANUAL"),
        allowNull: false,
        defaultValue: "PLAN",
      },

      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "tratamiento_equipo_actividades",
      timestamps: true,
    }
  );

  TratamientoEquipoActividad.associate = (models) => {
    TratamientoEquipoActividad.belongsTo(models.TratamientoEquipo, {
      foreignKey: "tratamientoEquipoId",
      as: "tratamientoEquipo",
    });

    TratamientoEquipoActividad.belongsTo(models.PlanMantenimientoActividad, {
      foreignKey: "planMantenimientoActividadId",
      as: "actividadPlan",
    });
  };

  return TratamientoEquipoActividad;
};