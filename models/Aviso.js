const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Aviso = sequelize.define(
    "Aviso",
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
         TIPO DE AVISO (CLAVE)
      ===================== */
      tipoAviso: {
        type: DataTypes.ENUM(
          "mantenimiento",
          "instalacion"
        ),
        allowNull: false,
      },

      origenAviso: {
  type: DataTypes.ENUM("manual", "guia"),
  allowNull: false,
  defaultValue: "manual",
},
      /* =====================
         IDENTIFICACIÓN
      ===================== */
      ordenVenta: {
        type: DataTypes.STRING,
      },

      centroCosto: {
        type: DataTypes.STRING,
      },

      numeroAviso: {
        type: DataTypes.STRING,
        unique: true,
      },

      /* =====================
         DESCRIPCIONES
      ===================== */
      descripcionResumida: {
        type: DataTypes.TEXT,
      },

      descripcion: {
        type: DataTypes.TEXT,
      },

      /* =====================
         CLASIFICACIÓN
      ===================== */
      prioridad: {
        type: DataTypes.ENUM("Baja", "Media", "Alta"),
      },


      

      // 👉 SOLO APLICA SI tipoAviso === "mantenimiento"
      tipoMantenimiento: {
        type: DataTypes.ENUM(
          "Preventivo",
          "Correctivo",
          "Mejora",
          "Predictivo"
        ),
        allowNull: true,
      },

      producto: {
        type: DataTypes.ENUM(
          "Racks",
          "Vehiculo",
          "Autosat",
          "Techo y Cerramiento",
          "Equipos Propios",
          "Sanitarias",
          "HVAC",
          "DACI",
          "ACI",
          "Datos y Comunicaciones",
          "Eléctrico",
          "Pisos y Estructuras"
        ),
      },

      /* =====================
         FECHAS
      ===================== */
      fechaAtencion: {
        type: DataTypes.DATEONLY,
      },

      /* =====================
         CLIENTE
      ===================== */
     clienteId: {
  type: DataTypes.UUID,
  allowNull: true,
},

      ordenCliente: {
        type: DataTypes.STRING,
      },

      almacen: {
        type: DataTypes.STRING,
      },

      sede: {
        type: DataTypes.STRING,
      },

      nombreContacto: {
        type: DataTypes.STRING,
      },

      correoContacto: {
        type: DataTypes.STRING,
      },

      numeroContacto: {
        type: DataTypes.STRING,
      },

      direccionAtencion: {
        type: DataTypes.STRING,
      },

      /* =====================
         GESTIÓN / FLUJO
      ===================== */
      solicitanteId: {
  type: DataTypes.UUID,
  allowNull: false,
},


      supervisorId: {
        type: DataTypes.UUID,
        allowNull:false,
      },

      estadoAviso: {
        type: DataTypes.ENUM(
          "creado",
          "tratado",
          "con OT",
          "rechazado",
          "finalizado",
          "finalizado sin facturacion",
          "facturado"
        ),
        defaultValue: "creado",
      },

      /* =====================
         DATOS FLEXIBLES
         (VIENEN DEL MODAL)
      ===================== */
      

      documentos: {
        type: DataTypes.JSON,
        defaultValue: [],
      },

      documentoFinal: {
        type: DataTypes.STRING,
      },


      paisId: {
  type: DataTypes.UUID,
  allowNull: false,
},

      /* =====================
         AUDITORÍA
      ===================== */
      creadoPor: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      guiaMantenimientoId: {
  type: DataTypes.UUID,
  allowNull: true,
},

guiaMantenimientoProgramacionId: {
  type: DataTypes.UUID,
  allowNull: true,
},
    },
    {
      tableName: "Avisos",
      timestamps: true,
    }
  );

  /* =====================
     ASOCIACIONES
  ===================== */
 Aviso.associate = (db) => {
  Aviso.belongsTo(db.Usuario, {
    foreignKey: "creadoPor",
    as: "creador",
  });


  Aviso.belongsTo(db.Usuario, {
    foreignKey: "solicitanteId",
    as: "solicitante",
  });


  Aviso.hasMany(db.AvisoEquipo, {
    foreignKey: "avisoId",
    as: "equiposRelacion",
  });


  Aviso.hasMany(db.Tratamiento, {
    foreignKey: "aviso_id",
    as: "tratamientos",
  });


  Aviso.hasMany(db.AvisoUbicacion, {
  foreignKey: "avisoId",
  as: "ubicacionesRelacion",
});

Aviso.belongsTo(db.Pais, {
  foreignKey: "paisId",
  as: "pais",
});

Aviso.belongsTo(db.GuiaMantenimiento, {
  foreignKey: "guiaMantenimientoId",
  as: "guiaMantenimiento",
});

Aviso.belongsTo(db.GuiaMantenimientoProgramacion, {
  foreignKey: "guiaMantenimientoProgramacionId",
  as: "programacionGuia",
});

Aviso.belongsTo(db.Cliente, {
  foreignKey: "clienteId",
  as: "clienteData",
});

Aviso.belongsTo(db.Trabajador,{
  foreignKey :"supervisorId",
  as: "supervisor"
})


};



  return Aviso;
};
