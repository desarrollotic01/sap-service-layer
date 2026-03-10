const SubtractAnticipacion = (fechaBase, tipo, valor) => {
  const base = new Date(fechaBase);
  if (Number.isNaN(base.getTime())) return null;

  const v = Number(valor);
  if (!Number.isFinite(v) || v <= 0) return null;

  const result = new Date(base);

  switch (tipo) {
    case "MINUTOS":
      result.setMinutes(result.getMinutes() - v);
      break;
    case "HORAS":
      result.setHours(result.getHours() - v);
      break;
    case "DIAS":
      result.setDate(result.getDate() - v);
      break;
    case "SEMANAS":
      result.setDate(result.getDate() - v * 7);
      break;
    default:
      return null;
  }

  return result;
};

module.exports = {
  SubtractAnticipacion,
};