const validarLogin = (data) => {
  const errors = [];

  if (!data.alias || data.alias.trim() === "") {
    errors.push("El nombre de usuario es obligatorio");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("La contraseña es obligatoria");
  }

  return errors;
};

module.exports = {
  validarLogin,
};
