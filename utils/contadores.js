const { Contador } = require("../db_connection");

/**
 * Incrementa atómicamente el contador `clave` y devuelve el número formateado.
 * Debe llamarse dentro de una transacción abierta `t`.
 * SELECT FOR UPDATE garantiza que dos transacciones concurrentes nunca produzcan el mismo número.
 *
 * @param {string} clave   - "AV" | "OT" | "SC" | "SA"
 * @param {string} prefijo - Prefijo del resultado ("AV" → "AV001")
 * @param {number} digits  - Ancho mínimo con ceros (3 → "001")
 * @param {Transaction} t  - Transacción Sequelize activa
 */
const siguienteNumero = async (clave, prefijo, digits, t) => {
  const fila = await Contador.findOne({
    where: { clave },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!fila) {
    throw new Error(`Contador "${clave}" no inicializado. ¿Se ejecutó initContadores()?`);
  }

  const siguiente = fila.valor + 1;
  await fila.update({ valor: siguiente }, { transaction: t });
  return `${prefijo}${String(siguiente).padStart(digits, "0")}`;
};

/**
 * Idempotente: crea las filas AV/OT/SC/SA si no existen.
 * El valor inicial se calcula buscando el máximo número ya existente en el formato nuevo
 * para evitar colisiones con datos previos.
 * Llamar una vez después de sequelize.sync().
 */
const initContadores = async () => {
  const {
    Aviso,
    OrdenTrabajo,
    SolicitudCompra,
    SolicitudAlmacen,
  } = require("../db_connection");

  const seeds = [
    { clave: "AV", model: Aviso,            field: "numeroAviso",     pat: /^AV(\d+)$/ },
    { clave: "OT", model: OrdenTrabajo,     field: "numeroOT",        pat: /^OT(\d+)$/ },
    { clave: "SC", model: SolicitudCompra,  field: "numeroSolicitud", pat: /^SC(\d+)$/ },
    { clave: "SA", model: SolicitudAlmacen, field: "numeroSolicitud", pat: /^SA(\d+)$/ },
  ];

  for (const { clave, model, field, pat } of seeds) {
    const existe = await Contador.findOne({ where: { clave } });
    if (existe) continue;

    const rows = await model.findAll({ attributes: [field] });
    let max = 0;
    for (const r of rows) {
      const m = String(r[field] ?? "").match(pat);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }

    await Contador.create({ clave, valor: max });
    console.log(`[Contadores] "${clave}" iniciado en ${max}`);
  }

  console.log("[Contadores] init OK");
};

module.exports = { siguienteNumero, initContadores };
