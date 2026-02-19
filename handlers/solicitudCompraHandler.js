const controller = require("../controllers/solicitudCompraController");

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

const validarUpdateSolicitud = (data) => {
  const errors = [];

  if (!data.requiredDate) {
    errors.push("La fecha requerida es obligatoria");
  }

  if (!data.requester) {
    errors.push("El solicitante es obligatorio");
  }

  if (!Array.isArray(data.lineas) || data.lineas.length === 0) {
    errors.push("Debe existir al menos una línea");
  } else {
    data.lineas.forEach((l, index) => {
      if (!l.itemCode) {
        errors.push(`Línea ${index + 1}: ItemCode obligatorio`);
      }
      if (!l.quantity || l.quantity <= 0) {
        errors.push(`Línea ${index + 1}: Cantidad inválida`);
      }
      if (!l.warehouseCode) {
        errors.push(`Línea ${index + 1}: Almacén obligatorio`);
      }
    });
  }

  return errors;
};  


const updateSolicitudHandler = async (req, res) => {
  const errors =validarUpdateSolicitud(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const result = await controller.updateSolicitudCompra(
    req.params.id,
    req.body
  );

  if (!result) {
    return res.status(404).json({
      errors: ["Solicitud no encontrada"],
    });
  }

  if (result === "NO_EDITABLE") {
    return res.status(400).json({
      errors: ["La solicitud ya fue enviada a SAP y no puede editarse"],
    });
  }

  res.json(result);
};


module.exports = {
  validarCreateSolicitud,
  validarUpdateSolicitud,
  updateSolicitudHandler,
};
