function validarAviso(body) {
  const errors = [];

  /* =====================
     TIPO DE AVISO
  ===================== */
  if (!body.tipoAviso) {
    errors.push("tipoAviso es obligatorio");
  } else if (!["mantenimiento", "instalacion"].includes(body.tipoAviso)) {
    errors.push("tipoAviso inválido");
  }

  /* =====================
     IDENTIFICACIÓN (OR)
  ===================== */
  if (!body.ordenVenta && !body.centroCosto) {
    errors.push(
      "Debe ingresar ordenVenta o centroCosto"
    );
  }

  if (!body.numeroAviso) {
    errors.push("numeroAviso es obligatorio");
  }

  /* =====================
     CLIENTE
  ===================== */
  if (!body.cliente) {
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
     UBICACIÓN Y EQUIPOS
  ===================== */
  if (!body.ubicacionTecnica) {
    errors.push("ubicacionTecnica es obligatoria");
  }

  if (!Array.isArray(body.equipos) || body.equipos.length === 0) {
    errors.push("Debe seleccionar al menos un equipo");
  }

  /* =====================
     MANTENIMIENTO (CONDICIONAL)
  ===================== */
  if (body.tipoAviso === "mantenimiento") {
    if (!body.tipoMantenimiento) {
      errors.push(
        "tipoMantenimiento es obligatorio para mantenimiento"
      );
    }
  }

  if (
    body.tipoAviso === "instalacion" &&
    body.tipoMantenimiento
  ) {
    errors.push(
      "tipoMantenimiento no aplica para instalación"
    );
  }

  return errors;
}

module.exports = { validarAviso };
