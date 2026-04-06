const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SolicitudCompra = sequelize.define(
    "SolicitudCompra",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      numeroSolicitud: {
  type: DataTypes.STRING,
  allowNull: true,
},

      // === CABECERA SAP ===
      docDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      requiredDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
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

origenSolicitudId: {
  type: DataTypes.UUID,
  allowNull: true,
},

esCopia: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},
origen: {
  type: DataTypes.ENUM("TRATAMIENTO", "OT"),
  defaultValue: "OT",
},


    },
    {
      tableName: "SolicitudesCompra",
      timestamps: true,
    }
  );

  SolicitudCompra.associate = (db) => {
    SolicitudCompra.belongsTo(db.Usuario, {
      foreignKey: "usuario_id",
      as: "usuario",
    });

    SolicitudCompra.hasMany(db.SolicitudCompraLinea, {
      foreignKey: "solicitud_compra_id",
      as: "lineas",
    });
    
    SolicitudCompra.belongsTo(db.Tratamiento, {
    foreignKey: "tratamiento_id",
    as: "tratamiento",
  });

  SolicitudCompra.belongsTo(db.OrdenTrabajo,
     { foreignKey: "ordenTrabajoId", as: "ordenTrabajo" });

     SolicitudCompra.belongsTo(db.Equipo, {
  foreignKey: "equipo_id",
  as: "equipo",
});

SolicitudCompra.belongsTo(db.UbicacionTecnica, {
  foreignKey: "ubicacion_tecnica_id",
  as: "ubicacionTecnica",
});



  };

  return SolicitudCompra;
};