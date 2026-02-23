// models/Tratamiento.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Tratamiento = sequelize.define(
    "Tratamiento",
    {
      /* =====================
         ID
      ===================== */
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },

      /* =====================
         RELACIÓN
      ===================== */
      aviso_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      /* =====================
         DEFINICIÓN DEL TRABAJO
      ===================== */
      contratista: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      /**
       * Viene DIRECTO del frontend
       * NO se transforma
       */
      requerimientos: {
        type: DataTypes.JSON,
        allowNull: false,
        /*
          [
            {
              rol: "electrico",
              label: "Técnico Eléctrico",
              cantidad: 2
            },
            {
              rol: "mecanico",
              label: "Técnico Mecánico",
              cantidad: 1
            }
          ]
        */
      },

      /* =====================
         ESTADO DEL TRATAMIENTO
      ===================== */
      estado: {
        type: DataTypes.ENUM(
          "CREADO",        // recién definido
          "CON_SOLICITUD", // tiene solicitud de compra
          "APROBADO"       // listo para OT
        ),
        defaultValue: "CREADO",
      },

      plan_mantenimiento_id: {
  type: DataTypes.UUID,
  allowNull: true,
},

      /* =====================
         AUDITORÍA
      ===================== */
      creado_por: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "Tratamientos",
      timestamps: true,
    }
  );

  /* =====================
     ASOCIACIONES
  ===================== */
  Tratamiento.associate = (db) => {
    Tratamiento.belongsTo(db.Aviso, {
      foreignKey: "aviso_id",
      as: "aviso",
    });

    Tratamiento.hasMany(db.SolicitudCompra, {
  foreignKey: "tratamiento_id",
  as: "solicitudesCompra",
});

    Tratamiento.hasMany(db.TratamientoTrabajador, {
      foreignKey: "tratamiento_id",
      as: "trabajadores",
    });

    
  };

  return Tratamiento;
};
