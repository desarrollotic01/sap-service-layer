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

      // === CABECERA SAP ===
      docDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      requiredDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      requester: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      comments: {
        type: DataTypes.TEXT,
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
  allowNull: false,
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

  };

  return SolicitudCompra;
};