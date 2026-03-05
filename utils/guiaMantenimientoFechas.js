const addHours = (d, h) => new Date(d.getTime() + h * 60 * 60 * 1000);

const addDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const addMonths = (d, months) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

const addYears = (d, years) => {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
};

const AddFrequency = (baseDate, frecuencia, frecuenciaHoras) => {
  const d = new Date(baseDate);

  switch (frecuencia) {
    case "POR_HORA":
      if (!frecuenciaHoras || typeof frecuenciaHoras !== "number" || frecuenciaHoras <= 0) {
        throw new Error("frecuenciaHoras inválida para POR_HORA.");
      }
      return addHours(d, frecuenciaHoras);

    case "DIARIA": return addDays(d, 1);
    case "SEMANAL": return addDays(d, 7);
    case "QUINCENAL": return addDays(d, 15);
    case "MENSUAL": return addMonths(d, 1);
    case "TRIMESTRAL": return addMonths(d, 3);
    case "SEMESTRAL": return addMonths(d, 6);
    case "ANUAL": return addYears(d, 1);
    case "BIENAL": return addYears(d, 2);
    case "QUINQUENAL": return addYears(d, 5);

    default:
      throw new Error("Frecuencia inválida en PlanMantenimiento.");
  }
};

const AddPeriodoGuia = (inicio, periodo) => {
  const d = new Date(inicio);

  switch (periodo) {
    case "DIARIO": return addDays(d, 1);
    case "SEMANAL": return addDays(d, 7);
    case "MENSUAL": return addMonths(d, 1);
    case "BIMESTRAL": return addMonths(d, 2);
    case "TRIMESTRAL": return addMonths(d, 3);
    case "SEIS_MESES": return addMonths(d, 6);
    case "ANUAL": return addYears(d, 1);
    case "CINCO_ANIOS": return addYears(d, 5);
    case "DIEZ_ANIOS": return addYears(d, 10);
    default:
      throw new Error("Periodo inválido en GuiaMantenimiento.");
  }
};

module.exports = { AddFrequency, AddPeriodoGuia };