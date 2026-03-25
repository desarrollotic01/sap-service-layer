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

    // ── Logo en base64: busca con múltiples extensiones ─────────────────────
    const assetsDir = path.join(__dirname, "../assets");
    const posibles = [
      "logo-Alsud.png", "logo-Alsud.jpg", "logo-Alsud.jpeg",
      "logo-Alsud.svg", "logo-Alsud.webp", "logo-Alsud",
    ];

    let logoSrc = "";
    for (const nombre of posibles) {
      const logoPath = path.join(assetsDir, nombre);
      if (fs.existsSync(logoPath)) {
        const ext = path.extname(nombre).toLowerCase().replace(".", "") || "png";
        const mime =
          ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : ext === "svg" ? "image/svg+xml"
          : ext === "webp" ? "image/webp"
          : "image/png";
        logoSrc = `data:${mime};base64,${fs.readFileSync(logoPath).toString("base64")}`;
        console.log("✅ Logo encontrado:", nombre);
        break;
      }
    }

    if (!logoSrc) console.warn("⚠️  Logo no encontrado en ../assets/");

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --green:       #22C55E;
      --green-dark:  #16A34A;
      --green-deep:  #14532D;
      --green-dim:   #dcfce7;
      --green-faint: #f0fdf4;
      --black:       #080808;
      --gray-1:      #1A1A1A;
      --gray-2:      #2D2D2D;
      --gray-3:      #4B4B4B;
      --gray-4:      #6B7280;
      --gray-5:      #9CA3AF;
      --gray-6:      #D1D5DB;
      --gray-7:      #E5E7EB;
      --gray-8:      #F9FAFB;
      --white:       #FFFFFF;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', Arial, sans-serif;
      font-size: 10.5px;
      color: var(--black);
      background: var(--white);
    }

    .watermark {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
    }
    .watermark img {
      width: 420px;
      opacity: 0.055;
      transform: rotate(-28deg);
      /* Convierte el logo a negro puro para que el watermark sea neutro */
      filter: grayscale(1) brightness(0);
    }

    /* ══ Todo el contenido encima del watermark ══ */
    .page-content {
      position: relative;
      z-index: 1;
    }

    /* ══ FRANJA TOP ══ */
    .top-stripe {
      height: 5px;
      background: linear-gradient(90deg, var(--green-dark), var(--green) 60%, var(--green-dark));
    }

    /* ══ ENCABEZADO ══ */
    .header {
      background: var(--black);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Logo en blanco (invertido) sobre fondo negro */
    .logo-box img {
      height: 38px;
      object-fit: contain;
      display: block;
      /* Fuerza el logo a blanco puro sobre fondo negro */
      filter: brightness(0) invert(1);
    }

    .header-sep {
      width: 1px;
      height: 34px;
      background: var(--gray-2);
    }

    .header-texts h1 {
      font-size: 16px;
      font-weight: 800;
      color: var(--white);
      letter-spacing: -0.4px;
      line-height: 1;
    }
    .header-texts p {
      font-size: 9px;
      color: var(--gray-5);
      margin-top: 3px;
    }

    .header-right { text-align: right; }

    .ot-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--gray-5);
      margin-bottom: 3px;
    }

    .ot-num {
      font-family: 'DM Mono', monospace;
      font-size: 18px;
      font-weight: 500;
      color: var(--green);
      letter-spacing: 1px;
      line-height: 1;
    }

    .estado-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 11px;
      background: var(--green);
      color: var(--black);
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      border-radius: 20px;
    }

    /* Línea verde degradada bajo header */
    .header-line {
      height: 3px;
      background: linear-gradient(90deg, var(--green) 0%, transparent 80%);
    }

    /* ══ CUERPO ══ */
    .body { padding: 20px 32px 24px; }

    /* ══ SECCIÓN ══ */
    .section { margin-bottom: 16px; }

    .section-title {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.6px;
      color: var(--gray-4);
      padding-bottom: 5px;
      border-bottom: 1.5px solid var(--gray-7);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 13px;
      background: var(--green);
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* ══ GRIDS ══ */
    .grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 20px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 20px; }

    .field label {
      display: block;
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--gray-4);
      margin-bottom: 2px;
    }
    .field span {
      font-size: 10.5px;
      color: var(--black);
      font-weight: 500;
    }

    /* ══ EQUIPO CARD ══ */
    .equipo-card {
      border: 1px solid var(--gray-7);
      border-top: 3px solid var(--green);
      border-radius: 6px;
      margin-bottom: 14px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    }

    .equipo-header {
      background: var(--gray-1);
      padding: 8px 14px;
      color: var(--white);
      font-size: 10.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .eq-dot {
      width: 7px; height: 7px;
      background: var(--green);
      border-radius: 50%;
      flex-shrink: 0;
    }

    .equipo-body { padding: 12px 14px; }

    /* ══ SUBTÍTULO ══ */
    .sub-title {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      color: var(--green-dark);
      margin: 13px 0 6px;
      padding-bottom: 4px;
      border-bottom: 1px dashed var(--green-dim);
    }

    /* ══ TABLA ══ */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 9.5px;
      border: 1px solid var(--gray-7);
      border-radius: 4px;
      overflow: hidden;
    }
    thead tr { background: var(--black); color: var(--white); }
    thead th {
      padding: 6px 8px;
      text-align: left;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 700;
    }
    thead th:first-child { color: var(--green); }
    tbody tr:nth-child(even) { background: var(--gray-8); }
    tbody tr:nth-child(odd)  { background: var(--white); }
    tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid var(--gray-7);
      vertical-align: top;
      color: var(--gray-1);
      line-height: 1.4;
    }

    /* ══ PERSONAL ══ */
    .personal-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 10px;
      margin-top: 4px;
    }
    .personal-item {
      padding: 7px 10px;
      border: 1px solid var(--gray-7);
      border-left: 3px solid var(--green);
      border-radius: 4px;
      background: var(--gray-8);
    }
    .personal-item .nombre {
      font-weight: 700;
      font-size: 10.5px;
      color: var(--black);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .personal-item .detalle {
      font-size: 9px;
      color: var(--gray-4);
      margin-top: 2px;
    }
    .encargado-tag {
      font-size: 7px;
      font-weight: 800;
      color: var(--black);
      background: var(--green);
      padding: 1px 6px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ══ OBS BOX ══ */
    .obs-box {
      border: 1px solid var(--green-dim);
      border-left: 3px solid var(--green);
      border-radius: 4px;
      padding: 7px 11px;
      background: var(--green-faint);
      font-size: 10.5px;
      line-height: 1.55;
      color: var(--gray-1);
    }

    /* ══ FIRMAS ══ */
    .firmas {
      margin-top: 36px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
    }
    .firma-item { text-align: center; }
    .firma-espacio {
      height: 52px;
      border-bottom: 1.5px solid var(--black);
      margin-bottom: 5px;
    }
    .firma-label {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .firma-sub {
      font-size: 8.5px;
      color: var(--gray-5);
      margin-top: 2px;
    }

    /* ══ PIE ══ */
    .footer {
      background: var(--black);
      padding: 9px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 28px;
    }
    .footer-item { font-size: 8.5px; color: var(--gray-5); }
    .footer-item strong { color: var(--green); font-weight: 700; }
    .footer-dot {
      width: 3px; height: 3px;
      background: var(--gray-3);
      border-radius: 50%;
    }
  </style>
</head>
<body>

  <!-- ══ MARCA DE AGUA (siempre, si hay logo) ══ -->
  ${logoSrc ? `
  <div class="watermark">
    <img src="${logoSrc}" alt="" />
  </div>` : ""}

  <div class="page-content">

    <!-- FRANJA VERDE TOP -->
    <div class="top-stripe"></div>

    <!-- ENCABEZADO NEGRO -->
    <div class="header">
      <div class="header-left">
        ${logoSrc ? `
        <div class="logo-box">
          <img src="${logoSrc}" alt="Alsud" />
        </div>
        <div class="header-sep"></div>
        ` : ""}
        <div class="header-texts">
          <h1>Orden de Trabajo</h1>
          <p>Generado el ${formatearFecha(new Date().toISOString())}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="ot-label">Número OT</div>
        <div class="ot-num">${val(orden.numeroOT)}</div>
        <div class="estado-badge">${labelEstado(orden.estado)}</div>
      </div>
    </div>
    <div class="header-line"></div>

    <!-- CUERPO -->
    <div class="body">

      <!-- INFO GENERAL -->
      <div class="section">
        <div class="section-title">Información General</div>
        <div class="grid">
          <div class="field"><label>Tipo de Mantenimiento</label><span>${val(orden.tipoMantenimiento)}</span></div>
          <div class="field"><label>Fecha Inicio Programada</label><span>${formatearFecha(orden.fechaProgramadaInicio)}</span></div>
          <div class="field"><label>Fecha Fin Programada</label><span>${formatearFecha(orden.fechaProgramadaFin)}</span></div>
          <div class="field"><label>Fecha Inicio Real</label><span>${formatearFecha(orden.fechaInicioReal)}</span></div>
          <div class="field"><label>Fecha Fin Real</label><span>${formatearFecha(orden.fechaFinReal)}</span></div>
          <div class="field"><label>Fecha Cierre</label><span>${formatearFecha(orden.fechaCierre)}</span></div>
        </div>
      </div>

      ${orden.observaciones ? `
      <div class="section">
        <div class="section-title">Observaciones Generales</div>
        <div class="obs-box">${val(orden.observaciones)}</div>
      </div>` : ""}

      ${orden.descripcionGeneral ? `
      <div class="section">
        <div class="section-title">Descripción General</div>
        <div class="obs-box">${val(orden.descripcionGeneral)}</div>
      </div>` : ""}

      <!-- EQUIPOS -->
      ${orden.equipos.map((eq, index) => {
        const esEquipo = !!eq.equipo;
        const data = esEquipo ? eq.equipo : eq.ubicacionTecnica;
        const tipoLabel = esEquipo ? "Equipo" : "Ubicación Técnica";
        return `
        <div class="section">
          <div class="section-title">${tipoLabel} ${index + 1}</div>
          <div class="equipo-card">
            <div class="equipo-header">
              <div class="eq-dot"></div>
              ${val(data?.nombre)} &nbsp;·&nbsp; ${val(data?.codigo)}
            </div>
            <div class="equipo-body">

              <div class="grid">
                <div class="field"><label>Código</label><span>${val(data?.codigo)}</span></div>
                <div class="field"><label>Nombre</label><span>${val(data?.nombre)}</span></div>
                <div class="field"><label>Serie</label><span>${val(data?.serie)}</span></div>
                <div class="field"><label>Marca</label><span>${val(data?.marca)}</span></div>
                <div class="field"><label>Modelo</label><span>${val(data?.modelo)}</span></div>
                <div class="field"><label>Estado</label><span>${val(data?.estado)}</span></div>
                <div class="field"><label>Tipo de Equipo</label><span>${val(data?.tipoEquipo)}</span></div>
                <div class="field"><label>Línea</label><span>${val(data?.linea)}</span></div>
                <div class="field"><label>Criticidad</label><span>${val(data?.creticidad)}</span></div>
                <div class="field"><label>ID de Placa</label><span>${val(data?.idPlaca)}</span></div>
                <div class="field"><label>ID Cliente</label><span>${val(data?.id_cliente)}</span></div>
                <div class="field"><label>Almacén</label><span>${val(data?.almacen)}</span></div>
                <div class="field"><label>Sede</label><span>${val(data?.sede)}</span></div>
                <div class="field"><label>N° Orden de Venta</label><span>${val(data?.numeroOV)}</span></div>
                <div class="field"><label>N° Orden Cliente</label><span>${val(data?.numeroOrdenCliente)}</span></div>
                <div class="field"><label>Operador Logístico</label><span>${val(data?.operadorLogistico)}</span></div>
                <div class="field"><label>Tipo Propiedad</label><span>${val(data?.tipoEquipoPropiedad)}</span></div>
                <div class="field"><label>Status</label><span>${val(data?.status)}</span></div>
                <div class="field"><label>Fin de Garantía</label><span>${formatearFechaSolo(data?.finGarantia)}</span></div>
                <div class="field"><label>Fecha Entrega Prevista</label><span>${formatearFechaSolo(data?.fechaEntregaPrevista)}</span></div>
                <div class="field"><label>Fecha Entrega Real</label><span>${formatearFechaSolo(data?.fechaEntregaReal)}</span></div>
                <div class="field"><label>Fecha OV</label><span>${formatearFechaSolo(data?.fechaOV)}</span></div>
              </div>

              <div class="sub-title">Datos de Asignación en OT</div>
              <div class="grid">
                <div class="field"><label>Prioridad</label><span>${val(eq.prioridad)}</span></div>
                <div class="field"><label>Estado en OT</label><span>${labelEstado(eq.estadoEquipo)}</span></div>
                <div class="field"><label>Inicio Programado</label><span>${formatearFecha(eq.fechaInicioProgramada)}</span></div>
                <div class="field"><label>Fin Programado</label><span>${formatearFecha(eq.fechaFinProgramada)}</span></div>
                <div class="field"><label>Inicio Real</label><span>${formatearFecha(eq.fechaInicioReal)}</span></div>
                <div class="field"><label>Fin Real</label><span>${formatearFecha(eq.fechaFinReal)}</span></div>
              </div>

              ${eq.descripcionEquipo ? `
              <div class="sub-title">Descripción del Equipo</div>
              <div class="obs-box">${val(eq.descripcionEquipo)}</div>` : ""}

              ${eq.observaciones ? `
              <div class="sub-title">Observaciones del Equipo</div>
              <div class="obs-box">${val(eq.observaciones)}</div>` : ""}

              <div class="sub-title">Personal Asignado</div>
              <div class="personal-list">
                ${eq.trabajadores.map(t => `
                  <div class="personal-item">
                    <div class="nombre">
                      ${val(t.trabajador.nombre)} ${val(t.trabajador.apellido)}
                      ${t.esEncargado ? '<span class="encargado-tag">Encargado</span>' : ""}
                    </div>
                    <div class="detalle">${labelRol(t.trabajador.rol)} &nbsp;·&nbsp; DNI: ${val(t.trabajador.dni)}</div>
                    <div class="detalle">Empresa: ${val(t.trabajador.empresa)}</div>
                  </div>
                `).join("")}
              </div>

              <div class="sub-title">Actividades</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tarea</th>
                    <th>Sistema / Subsistema / Componente</th>
                    <th>Tipo de Trabajo</th>
                    <th>Rol Técnico</th>
                    <th>Cant.</th>
                    <th>Duración Est.</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  ${eq.actividades.map((act, i) => `
                    <tr>
                      <td style="font-family:'DM Mono',monospace;color:var(--green-dark);font-weight:700;font-size:9px">${String(i + 1).padStart(2, "0")}</td>
                      <td>${val(act.tarea)}</td>
                      <td style="color:var(--gray-3)">${val(act.sistema)} / ${val(act.subsistema)} / ${val(act.componente)}</td>
                      <td>${labelTipoTrabajo(act.tipoTrabajo)}</td>
                      <td>${labelRol(act.rolTecnico)}</td>
                      <td style="text-align:center;font-weight:700;color:var(--green-dark)">${val(act.cantidadTecnicos)}</td>
                      <td style="font-family:'DM Mono',monospace;font-size:9px">${val(act.duracionEstimadaValor)} ${val(act.unidadDuracion)}</td>
                      <td>${val(act.origen)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>

            </div>
          </div>
        </div>`;
      }).join("")}

      <!-- FIRMAS -->
      <div class="firmas">
        <div class="firma-item">
          <div class="firma-espacio"></div>
          <div class="firma-label">Técnico</div>
          <div class="firma-sub">Nombre y firma</div>
        </div>
        <div class="firma-item">
          <div class="firma-espacio"></div>
          <div class="firma-label">Supervisor</div>
          <div class="firma-sub">Nombre y firma</div>
        </div>
        <div class="firma-item">
          <div class="firma-espacio"></div>
          <div class="firma-label">Responsable</div>
          <div class="firma-sub">Nombre y firma</div>
        </div>
      </div>

    </div><!-- /body -->

    <!-- PIE NEGRO -->
    <div class="footer">
      <div class="footer-item">OT: <strong>${val(orden.numeroOT)}</strong></div>
      <div class="footer-dot"></div>
      <div class="footer-item">Tipo: <strong>${val(orden.tipoMantenimiento)}</strong></div>
      <div class="footer-dot"></div>
      <div class="footer-item">Estado: <strong>${labelEstado(orden.estado)}</strong></div>
    </div>

  </div><!-- /page-content -->

</body>
</html>`;

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
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
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