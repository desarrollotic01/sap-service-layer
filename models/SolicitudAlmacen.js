const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SolicitudAlmacen = sequelize.define(
    "SolicitudAlmacen",
    {
      
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },


      numeroSolicitud: {
  type: DataTypes.STRING,
  allowNull: false,
},

      // === CABECERA SAP ===
      docDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      requiredDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },


      docCurrency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PEN",
      },

      docRate: {
        type: DataTypes.DECIMAL(15, 6),
        allowNull: false,
        defaultValue: 1,
      },

      branchId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      requester: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // === CONTROL ===
      estado: {
        type: DataTypes.ENUM("DRAFT", "SENT", "ERROR"),
        defaultValue: "DRAFT",
      },

      sapDocNum: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tratamiento_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      equipo_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      ubicacion_tecnica_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      esGeneral: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      ordenTrabajoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      destinatario_id: {
  type: DataTypes.UUID,
  allowNull: true,
},

bloque_id: {
  type: DataTypes.UUID,
  allowNull: true,
},

origen: {
  type: DataTypes.ENUM("TRATAMIENTO", "OT"),
  defaultValue: "TRATAMIENTO",
},

esCopia: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},

origenSolicitudId: {
  type: DataTypes.UUID,
  allowNull: true,
},

esConsolidada: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},

// Correos en copia (CC) para el envío de la solicitud de almacén
// Array de strings: ["correo1@empresa.com", "correo2@empresa.com"]
ccEmails: {
  type: DataTypes.JSONB,
  allowNull: true,
  defaultValue: [],
},
    },
    {
      tableName: "SolicitudesAlmacen",
      timestamps: true,
    }
  );

  SolicitudAlmacen.associate = (db) => {
    SolicitudAlmacen.belongsTo(db.Usuario, {
      foreignKey: "usuario_id",
      as: "usuario",
    });

    SolicitudAlmacen.hasMany(db.SolicitudAlmacenLinea, {
      foreignKey: "solicitud_almacen_id",
      as: "lineas",
    });

    SolicitudAlmacen.belongsTo(db.Tratamiento, {
      foreignKey: "tratamiento_id",
      as: "tratamiento",
    });

    SolicitudAlmacen.belongsTo(db.OrdenTrabajo, {
      foreignKey: "ordenTrabajoId",
      as: "ordenTrabajo",
    });

    SolicitudAlmacen.belongsTo(db.Equipo, {
  foreignKey: "equipo_id",
  as: "equipo",
});

SolicitudAlmacen.belongsTo(db.UbicacionTecnica, {
  foreignKey: "ubicacion_tecnica_id",
  as: "ubicacionTecnica",
});

SolicitudAlmacen.belongsTo(db.PersonalCorreo, {
  foreignKey: "destinatario_id",
  as: "destinatario",
});
    
  };

  return SolicitudAlmacen;
};