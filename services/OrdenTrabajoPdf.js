const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatearFecha(valor) {
  if (!valor) return "-";
  const d = new Date(valor);
  if (isNaN(d)) return valor;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatearFechaSolo(valor) {
  if (!valor) return "-";
  const d = new Date(valor);
  if (isNaN(d)) return valor;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function val(v) {
  return v !== null && v !== undefined && v !== "" ? v : "-";
}

function labelRol(rol) {
  const mapa = {
    supervisor: "Supervisor",
    tecnico_electrico: "Técnico Eléctrico",
    tecnico_mecanico: "Técnico Mecánico",
    operario_de_mantenimiento: "Operario de Mantenimiento",
  };
  return mapa[rol] || val(rol);
}

function labelTipoTrabajo(tipo) {
  const mapa = {
    REPARACION: "Reparación",
    INSPECCION: "Inspección",
    PREVENTIVO: "Preventivo",
    CORRECTIVO: "Correctivo",
  };
  return mapa[tipo] || val(tipo);
}

function labelEstado(estado) {
  const mapa = {
    PENDIENTE: "Pendiente",
    EN_PROCESO: "En Proceso",
    COMPLETADO: "Completado",
    LIBERADO: "Liberado",
  };
  return mapa[estado] || val(estado);
}

// ─── Generador Principal ─────────────────────────────────────────────────────

async function generarOrdenTrabajoPDF(orden) {
  try {
    const carpeta = path.join(__dirname, "../ordenes_trabajo");
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

    const filePath = path.join(carpeta, `${orden.numeroOT}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const logoPath = path.join(__dirname, "../assets/logo-alsud.png");
const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 28px 32px;
  }

  /* HEADER */
  .header {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 10px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left h1 {
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo {
    width: 90px;
    object-fit: contain;
  }

  .ot-info {
    text-align: right;
  }

  .ot-num {
    font-size: 15px;
    font-weight: bold;
  }

  .badge {
    display: inline-block;
    margin-top: 4px;
    padding: 2px 10px;
    border: 1px solid #1a1a1a;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
  }

  .section { margin-bottom: 14px; }

  .section-title {
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px 16px;
  }

  .field label {
    font-size: 9px;
    font-weight: bold;
    color: #777;
  }

  .field span {
    font-size: 11px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    font-size: 10px;
  }

  thead {
    background: #1a1a1a;
    color: #fff;
  }

  th, td {
    padding: 5px;
  }

</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <h1>Orden de Trabajo</h1>
    <p>${formatearFecha(new Date().toISOString())}</p>
  </div>

  <div class="header-right">
    <img src="data:image/png;base64,${logoBase64}" class="logo" />

    <div class="ot-info">
      <div class="ot-num">${val(orden.numeroOT)}</div>
      <div class="badge">${labelEstado(orden.estado)}</div>
    </div>
  </div>
</div>

<!-- CONTENIDO -->
<div class="section">
  <div class="section-title">Información General</div>
  <div class="grid">
    <div class="field"><label>Tipo</label><span>${val(orden.tipoMantenimiento)}</span></div>
    <div class="field"><label>Inicio</label><span>${formatearFecha(orden.fechaProgramadaInicio)}</span></div>
    <div class="field"><label>Fin</label><span>${formatearFecha(orden.fechaProgramadaFin)}</span></div>
  </div>
</div>

${orden.equipos.map((eq, i) => `
<div class="section">
  <div class="section-title">Equipo ${i + 1}</div>

  <div class="grid">
    <div class="field"><label>Nombre</label><span>${val(eq.equipo?.nombre)}</span></div>
    <div class="field"><label>Código</label><span>${val(eq.equipo?.codigo)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Tarea</th>
        <th>Duración</th>
      </tr>
    </thead>
    <tbody>
      ${eq.actividades.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${val(a.tarea)}</td>
        <td>${val(a.duracionEstimadaValor)}</td>
      </tr>
      `).join("")}
    </tbody>
  </table>
</div>
`).join("")}

</body>
</html>
`;

    // 🚀 Generar PDF con Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    await browser.close();

    console.log("✅ PDF generado:", filePath);
    return filePath;

  } catch (error) {
    console.error("❌ Error generando PDF:", error);
    throw error;
  }
}

module.exports = { generarOrdenTrabajoPDF };