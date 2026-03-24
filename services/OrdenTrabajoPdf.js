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
      background: #fff;
    }

    /* ── Encabezado ── */
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-left h1 {
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-left p {
      font-size: 11px;
      color: #555;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .header-right .ot-num {
      font-size: 15px;
      font-weight: bold;
    }
    .header-right .badge {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 10px;
      border: 1px solid #1a1a1a;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Secciones ── */
    .section {
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #555;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }

    /* ── Grid de campos ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 16px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
    }
    .field label {
      display: block;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #777;
      margin-bottom: 1px;
    }
    .field span {
      font-size: 11px;
      color: #1a1a1a;
    }

    /* ── Equipo card ── */
    .equipo-card {
      border: 1px solid #bbb;
      border-radius: 4px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .equipo-header {
      background: #f0f0f0;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #bbb;
    }
    .equipo-body {
      padding: 10px 12px;
    }

    /* ── Subsección dentro de equipo ── */
    .sub-title {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #555;
      margin: 10px 0 5px;
      border-bottom: 1px dashed #ccc;
      padding-bottom: 2px;
    }

    /* ── Tabla ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10px;
    }
    thead tr {
      background: #1a1a1a;
      color: #fff;
    }
    thead th {
      padding: 5px 6px;
      text-align: left;
      font-weight: bold;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    tbody tr:nth-child(even) {
      background: #f8f8f8;
    }
    tbody td {
      padding: 4px 6px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }

    /* ── Personal ── */
    .personal-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 16px;
      margin-top: 4px;
    }
    .personal-item {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      background: #fafafa;
    }
    .personal-item .nombre {
      font-weight: bold;
      font-size: 11px;
    }
    .personal-item .detalle {
      font-size: 9px;
      color: #666;
      margin-top: 1px;
    }
    .encargado-tag {
      font-size: 8px;
      font-weight: bold;
      color: #fff;
      background: #1a1a1a;
      padding: 1px 5px;
      border-radius: 2px;
      margin-left: 4px;
      vertical-align: middle;
    }

    /* ── Observaciones ── */
    .obs-box {
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 6px 10px;
      background: #fafafa;
      font-size: 11px;
      line-height: 1.5;
    }

    /* ── Firmas ── */
    .firmas {
      margin-top: 40px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .firma-item {
      text-align: center;
    }
    .firma-linea {
      border-top: 1px solid #1a1a1a;
      margin-bottom: 4px;
    }
    .firma-label {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .firma-sub {
      font-size: 9px;
      color: #777;
    }

    /* ── Pie de página ── */
    .footer {
      margin-top: 20px;
      border-top: 1px solid #ccc;
      padding-top: 6px;
      font-size: 9px;
      color: #888;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ══════════════════ ENCABEZADO ══════════════════ -->
  <div class="header">
    <div class="header-left">
      <h1>Orden de Trabajo</h1>
      <p>Documento generado el ${formatearFecha(new Date().toISOString())}</p>
    </div>
    <div class="header-right">
      <div class="ot-num">${val(orden.numeroOT)}</div>
      <div class="badge">${labelEstado(orden.estado)}</div>
    </div>
  </div>

  <!-- ══════════════════ INFORMACIÓN GENERAL ══════════════════ -->
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

  <!-- ══════════════════ EQUIPOS ══════════════════ -->
  ${orden.equipos.map((eq, index) => {
    const esEquipo = !!eq.equipo;
    const data = esEquipo ? eq.equipo : eq.ubicacionTecnica;
    const tipoLabel = esEquipo ? "Equipo" : "Ubicación Técnica";

    return `
    <div class="equipo-card">
      <div class="equipo-header">${tipoLabel} ${index + 1} — ${val(data?.nombre)} (${val(data?.codigo)})</div>
      <div class="equipo-body">

        <!-- Datos del equipo -->
        <div class="grid">
          <div class="field"><label>Código</label><span>${val(data?.codigo)}</span></div>
          <div class="field"><label>Nombre</label><span>${val(data?.nombre)}</span></div>
          <div class="field"><label>Serie</label><span>${val(data?.serie)}</span></div>
          <div class="field"><label>Marca</label><span>${val(data?.marca)}</span></div>
          <div class="field"><label>Modelo</label><span>${val(data?.modelo)}</span></div>
          <div class="field"><label>Estado del Equipo</label><span>${val(data?.estado)}</span></div>
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

        <!-- Datos de la asignación OT -->
        <div class="sub-title">Datos de Asignación en OT</div>
        <div class="grid">
          <div class="field"><label>Prioridad</label><span>${val(eq.prioridad)}</span></div>
          <div class="field"><label>Estado del Equipo en OT</label><span>${labelEstado(eq.estadoEquipo)}</span></div>
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

        <!-- Personal asignado -->
        <div class="sub-title">Personal Asignado</div>
        <div class="personal-list">
          ${eq.trabajadores.map(t => `
            <div class="personal-item">
              <div class="nombre">
                ${val(t.trabajador.nombre)} ${val(t.trabajador.apellido)}
                ${t.esEncargado ? '<span class="encargado-tag">Encargado</span>' : ""}
              </div>
              <div class="detalle">${labelRol(t.trabajador.rol)} · DNI: ${val(t.trabajador.dni)}</div>
              <div class="detalle">Empresa: ${val(t.trabajador.empresa)}</div>
            </div>
          `).join("")}
        </div>

        <!-- Actividades -->
        <div class="sub-title">Actividades</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tarea</th>
              <th>Sistema / Subsistema / Componente</th>
              <th>Tipo de Trabajo</th>
              <th>Rol Técnico</th>
              <th>Cant. Técnicos</th>
              <th>Duración Estimada</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody>
            ${eq.actividades.map((act, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${val(act.tarea)}</td>
                <td>${val(act.sistema)} / ${val(act.subsistema)} / ${val(act.componente)}</td>
                <td>${labelTipoTrabajo(act.tipoTrabajo)}</td>
                <td>${labelRol(act.rolTecnico)}</td>
                <td style="text-align:center">${val(act.cantidadTecnicos)}</td>
                <td>${val(act.duracionEstimadaValor)} ${val(act.unidadDuracion)}</td>
                <td>${val(act.origen)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

      </div>
    </div>`;
  }).join("")}

  <!-- ══════════════════ FIRMAS ══════════════════ -->
  <div class="firmas">
    <div class="firma-item">
      <div style="height:50px;"></div>
      <div class="firma-linea"></div>
      <div class="firma-label">Técnico</div>
      <div class="firma-sub">Nombre y firma</div>
    </div>
    <div class="firma-item">
      <div style="height:50px;"></div>
      <div class="firma-linea"></div>
      <div class="firma-label">Supervisor</div>
      <div class="firma-sub">Nombre y firma</div>
    </div>
    <div class="firma-item">
      <div style="height:50px;"></div>
      <div class="firma-linea"></div>
      <div class="firma-label">Responsable</div>
      <div class="firma-sub">Nombre y firma</div>
    </div>
  </div>

  <!-- ══════════════════ PIE ══════════════════ -->
  <div class="footer">
    <span>OT: ${val(orden.numeroOT)}</span>
    <span>Tipo: ${val(orden.tipoMantenimiento)}</span>
    <span>Estado: ${labelEstado(orden.estado)}</span>
  </div>

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