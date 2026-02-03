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
      cliente: {
        type: DataTypes.STRING,
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

      /* =====================
         UBICACIÓN
      ===================== */
      ubicacionTecnica: {
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


      supervisorAsignado: {
        type: DataTypes.STRING,
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

      /* =====================
         AUDITORÍA
      ===================== */
      creadoPor: {
        type: DataTypes.UUID,
        allowNull: false,
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
};



  return Aviso;
};
