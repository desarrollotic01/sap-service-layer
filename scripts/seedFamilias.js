require("dotenv").config();

const { Familia } = require("../db_connection");
const { Op } = require("sequelize");

const FAMILIAS = [
  { nombre: "AutoSat",        descripcion: "Equipos de la línea AutoSat" },
  { nombre: "Puertas Rápidas", descripcion: "Equipos de puertas rápidas" },
  { nombre: "Transpaleta",    descripcion: "Equipos transpaleta" },
];

async function main() {
  try {
    // Agregar familias nuevas (si ya existen no las duplica)
    for (const f of FAMILIAS) {
      const [, created] = await Familia.findOrCreate({
        where: { nombre: f.nombre },
        defaults: f,
      });
      if (created) {
        console.log(`✅ Familia creada: ${f.nombre}`);
      } else {
        console.log(`ℹ️  Ya existe: ${f.nombre}`);
      }
    }

    // Corregir "Traspaleta" → "Transpaleta" si existe con la ortografía incorrecta
    const [updated] = await Familia.update(
      { nombre: "Transpaleta" },
      { where: { nombre: { [Op.iLike]: "traspaleta" } } }
    );
    if (updated > 0) {
      console.log(`✅ Corregido: "Traspaleta" → "Transpaleta" (${updated} registro/s)`);
    }

    console.log("🎉 Familias actualizadas correctamente");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
