const validarCreateSolicitud = (data) => {
  const errors = [];

  if (!data.requiredDate) {
    errors.push("La fecha requerida es obligatoria");
  }

  if (!Array.isArray(data.lineas) || data.lineas.length === 0) {
    errors.push("Debe existir al menos una línea");
  } else {
    data.lineas.forEach((l, index) => {
      if (!l.itemCode) {
        errors.push(`Linea ${index + 1}: ItemCode obligatorio`);
      }
      if (!l.quantity || l.quantity <= 0) {
        errors.push(`Linea ${index + 1}: Cantidad inválida`);
      }
      if (!l.warehouseCode) {
        errors.push(`Linea ${index + 1}: Almacén obligatorio`);
      }
    });
  }

  return errors;
};

module.exports = {
  validarCreateSolicitud,
};
