
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PersonalCorreo = sequelize.define("PersonalCorreo", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    nombre: DataTypes.STRING,
    correo: DataTypes.STRING,
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  return PersonalCorreo; // 🔥 IMPORTANTE
};