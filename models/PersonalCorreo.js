
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
  });

  return PersonalCorreo; // 🔥 IMPORTANTE
};