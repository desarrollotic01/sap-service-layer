function validarAviso(body) {
  const errors = [];

  /* =====================
     TIPO DE AVISO
  ===================== */
  if (!body.tipoAviso) {
    errors.push("tipoAviso es obligatorio");
  } else if (!["mantenimiento", "instalacion", "venta"].includes(body.tipoAviso)) {
    errors.push("tipoAviso inválido");
  }

  /* =====================
     IDENTIFICACIÓN (OR)  [todos los tipos]
  ===================== */
  if (!body.ordenVenta && !body.centroCosto) {
    errors.push("Debe ingresar ordenVenta o centroCosto");
  }

  /* =====================
     CLIENTE
  ===================== */
  if (!body.clienteId) {
    errors.push("cliente es obligatorio");
  }

  if (!body.nombreContacto) {
    errors.push("nombreContacto es obligatorio");
  }

  if (!body.correoContacto) {
    errors.push("correoContacto es obligatorio");
  }

  if (!body.numeroContacto) {
    errors.push("numeroContacto es obligatorio");
  }

  /* =====================
     DESCRIPCIÓN
  ===================== */
  if (!body.descripcion) {
    errors.push("descripcion es obligatoria");
  }

  if (!body.producto) {
    errors.push("producto es obligatorio");
  }

  if (!body.fechaAtencion) {
    errors.push("fechaAtencion es obligatoria");
  }

  /* =====================
     MANTENIMIENTO (CONDICIONAL)
  ===================== */
  if (body.tipoAviso === "mantenimiento") {
    if (!body.tipoMantenimiento) {
      errors.push("tipoMantenimiento es obligatorio para mantenimiento");
    }
  }

  if (body.tipoAviso === "instalacion" && body.tipoMantenimiento) {
    errors.push("tipoMantenimiento no aplica para instalación");
  }

  if (body.tipoAviso === "venta" && body.tipoMantenimiento) {
    errors.push("tipoMantenimiento no aplica para venta");
  }

  return errors;
}

module.exports = { validarAviso };
