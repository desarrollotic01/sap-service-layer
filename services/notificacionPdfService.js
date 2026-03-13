const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-PE");
};

const fmtDuracion = (valor, unidad) => {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `${valor} ${unidad || ""}`.trim();
};

const fileToBase64DataUrl = (relativeUrl) => {
  if (!relativeUrl) return null;

  try {
    const clean = String(relativeUrl).replace(/^\/+/, "");
    const absolutePath = path.join(process.cwd(), clean);

    if (!fs.existsSync(absolutePath)) return null;

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    const mime = mimeMap[ext];
    if (!mime) return null;

    const fileBuffer = fs.readFileSync(absolutePath);
    const base64 = fileBuffer.toString("base64");

    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
};

const CATEGORIAS_FOTO = new Set(["ANTES", "DESPUES"]);
const CATEGORIAS_CORRECTIVO = new Set(["CORRECTIVO"]);

const getNombreTecnico = (t) =>
  t?.nombreApellido ||
  t?.nombreCompleto ||
  t?.nombre ||
  t?.alias ||
  t?.usuario ||
  "—";

const getEstadoBadgeClass = (estado) => {
  const e = String(estado || "").toUpperCase();

  if (e === "OK") return "ok";
  if (e === "NO_OK" || e === "NOK") return "nok";
  return "na";
};

const getEstadoLabel = (estado) => {
  const e = String(estado || "").toUpperCase();

  if (e === "NO_OK") return "NO OK";
  if (e === "NO_APLICA" || e === "NA" || e === "N/A") return "NA";
  if (e === "OK") return "OK";

  return "NA";
};

const getTipoMantenimientoLabel = (n) => {
  const raw =
    n?.tipoMantenimiento ||
    n?.ordenTrabajo?.tipoMantenimiento ||
    n?.equipoOT?.tipoMantenimiento ||
    n?.equipoOT?.planMantenimiento?.tipo ||
    n?.planes?.[0]?.plan?.tipo ||
    "";

  const t = String(raw).toUpperCase();

  if (t.includes("CORRECT")) return "CORRECTIVO";
  if (t.includes("PREVENT")) return "PREVENTIVO";
  if (t.includes("INSPE")) return "INSPECCIÓN";
  if (t.includes("MEJORA")) return "MEJORA";

  return "—";
};

const agruparFotosActividad = (adjuntos = []) => {
  const base = {
    ANTES: [],
    DESPUES: [],
  };

  for (const adj of adjuntos || []) {
    if (!adj?.categoria) continue;
    if (!CATEGORIAS_FOTO.has(adj.categoria)) continue;

    const src = fileToBase64DataUrl(adj.url) || adj.url || null;
    if (!src) continue;

    base[adj.categoria].push({
      id: adj.id,
      nombre: adj.nombre || "",
      descripcion: adj.descripcion || "",
      categoria: adj.categoria,
      src,
    });
  }

  return base;
};

const obtenerCorrectivos = (adjuntos = []) => {
  const correctivos = [];

  for (const adj of adjuntos || []) {
    if (!adj?.categoria) continue;
    if (!CATEGORIAS_CORRECTIVO.has(adj.categoria)) continue;

    const src = fileToBase64DataUrl(adj.url) || adj.url || null;
    if (!src) continue;

    correctivos.push({
      id: adj.id,
      nombre: adj.nombre || "",
      descripcion: adj.descripcion || "",
      categoria: adj.categoria,
      src,
    });
  }

  return correctivos;
};

const renderSimpleInfoField = (label, value) => `
  <div class="field">
    <div class="label">${esc(label)}</div>
    <div class="value">${esc(value ?? "—")}</div>
  </div>
`;

const renderPhotoBox = (titulo, fotos = []) => {
  return `
    <div class="evidence-box">
      <div class="evidence-title">${esc(titulo)}</div>
      <div class="photo-grid">
        ${
          fotos.length
            ? fotos
                .map(
                  (f) => `
              <div class="photo-card">
                <div class="photo-wrap">
                  <img src="${esc(f.src)}" />
                </div>
                <div class="photo-caption">
                  ${esc(f.descripcion || f.nombre || f.categoria || "Imagen")}
                </div>
              </div>
            `
                )
                .join("")
            : `<div class="empty-box">Sin imágenes</div>`
        }
      </div>
    </div>
  `;
};

const renderActividadResumenRow = (p, index) => {
  const act = p?.actividad || {};
  const estado = getEstadoLabel(p?.estado);
  const badgeClass = getEstadoBadgeClass(p?.estado);

  return `
    <tr>
      <td>${index + 1}</td>
      <td>${esc(act?.sistema ?? "—")}</td>
      <td>${esc(act?.subsistema ?? "—")}</td>
      <td>${esc(act?.componente ?? "—")}</td>
      <td>${esc(act?.tarea ?? "—")}</td>
      <td>${esc(act?.tipoTrabajo ?? "—")}</td>
      <td><span class="badge ${badgeClass}">${esc(estado)}</span></td>
    </tr>
  `;
};

const renderActividadDetalle = (p, index) => {
  const act = p?.actividad || {};
  const tecnico = p?.trabajador ? getNombreTecnico(p.trabajador) : "—";
  const estado = getEstadoLabel(p?.estado);
  const badgeClass = getEstadoBadgeClass(p?.estado);

  const fotos = agruparFotosActividad(p?.adjuntos || []);
  const correctivos = obtenerCorrectivos(p?.adjuntos || []);

  const correctivosHtml = correctivos.length
    ? correctivos
        .map(
          (adj, correctivoIndex) => `
          <div class="correctivo-card">
            <div class="correctivo-number">Correctivo ${correctivoIndex + 1}</div>
            <div class="correctivo-text">
              ${esc(
                adj.descripcion ||
                  adj.nombre ||
                  p?.comentario ||
                  act?.tarea ||
                  "Correctivo registrado"
              )}
            </div>
            <div class="correctivo-photo">
              <img src="${esc(adj.src)}" />
            </div>
          </div>
        `
        )
        .join("")
    : `<div class="empty-box">Sin correctivos con evidencia</div>`;

  return `
    <div class="activity-detail">
      <div class="activity-detail-head">
        <div class="activity-detail-title">
          Actividad ${index + 1}: ${esc(act?.tarea ?? "—")}
        </div>
        <span class="badge ${badgeClass}">${esc(estado)}</span>
      </div>

      <div class="detail-grid">
        ${renderSimpleInfoField("Sistema", act?.sistema)}
        ${renderSimpleInfoField("Subsistema", act?.subsistema)}
        ${renderSimpleInfoField("Componente", act?.componente)}
        ${renderSimpleInfoField("Tipo de trabajo", act?.tipoTrabajo)}
        ${renderSimpleInfoField("Técnico", tecnico)}
        ${renderSimpleInfoField(
          "Duración",
          fmtDuracion(p?.duracionPlan, p?.unidadDuracionPlan)
        )}
        ${renderSimpleInfoField("Fecha inicio", fmtDate(p?.fechaInicioPlan))}
        ${renderSimpleInfoField("Fecha fin", fmtDate(p?.fechaFinPlan))}
      </div>

      <div class="text-box">
        <div class="label">Comentario</div>
        <div>${esc(p?.comentario || "—")}</div>
      </div>

      <div class="text-box">
        <div class="label">Observaciones de actividad</div>
        <div>${esc(p?.observaciones || "—")}</div>
      </div>

      <div class="section-subtitle">Fotos de actividad</div>
      <div class="evidence-pair">
        ${renderPhotoBox("Antes", fotos.ANTES)}
        ${renderPhotoBox("Después", fotos.DESPUES)}
      </div>

      <div class="section-subtitle">Correctivos</div>
      <div class="correctivos-grid">
        ${correctivosHtml}
      </div>
    </div>
  `;
};

function buildHtml(notificacion) {
  const n = notificacion || {};
  const ot = n?.ordenTrabajo || {};
  const equipoOT = n?.equipoOT || {};
  const equipo = equipoOT?.equipo || null;
  const ubicacion = equipoOT?.ubicacionTecnica || null;
  const planOT =
    equipoOT?.planMantenimiento ||
    n?.planes?.[0]?.plan ||
    null;

  const esEquipo = !!equipo;

  const trabajadoresOT = Array.isArray(n?.equipoOT?.trabajadores)
    ? n.equipoOT.trabajadores
    : [];

  const encargadoOT =
    trabajadoresOT.find((t) => t?.esEncargado)?.trabajador || null;

  const encargadoNombre = encargadoOT
    ? getNombreTecnico(encargadoOT)
    : "—";

  const trabajadoresHtml =
    trabajadoresOT.length > 0
      ? trabajadoresOT
          .map((tw) => {
            const nombre = getNombreTecnico(tw?.trabajador);
            return `
              <div class="worker-chip ${tw?.esEncargado ? "encargado" : ""}">
                ${esc(nombre)}
                ${tw?.esEncargado ? `<span class="worker-tag">ENCARGADO</span>` : ""}
              </div>
            `;
          })
          .join("")
      : `<div class="empty-box">Sin trabajadores registrados</div>`;

  const clienteNombre =
    ot?.cliente?.razonSocial ||
    n?.cliente?.razonSocial ||
    n?.clienteNombre ||
    "—";

  const clienteRuc =
    ot?.cliente?.ruc ||
    n?.cliente?.ruc ||
    "—";

  const clienteCorreo =
    ot?.cliente?.correo ||
    n?.cliente?.correo ||
    "—";

  const clienteTelefono =
    ot?.cliente?.telefono ||
    n?.cliente?.telefono ||
    "—";

  const tipoMantenimiento = getTipoMantenimientoLabel(n);

  const actividades = Array.isArray(n?.planes) ? n.planes : [];

  const actividadesResumenHtml = actividades.length
    ? actividades.map(renderActividadResumenRow).join("")
    : `<tr><td colspan="7">Sin actividades registradas</td></tr>`;

  const actividadesDetalleHtml = actividades.length
    ? actividades.map(renderActividadDetalle).join("")
    : `<div class="box">Sin actividades registradas</div>`;

  const equipoOperativo =
    String(n?.estadoGeneralEquipo || "").toUpperCase() === "INOPERATIVO"
      ? "NO"
      : "SI";

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      margin: 14mm 12mm;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      margin: 0;
      padding: 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
    }

    .meta {
      text-align: right;
      font-size: 10px;
      line-height: 1.5;
    }

    .section-title {
      margin: 16px 0 8px 0;
      font-size: 14px;
      font-weight: 700;
      border-bottom: 2px solid #111;
      padding-bottom: 4px;
    }

    .section-subtitle {
      margin: 12px 0 8px 0;
      font-size: 12px;
      font-weight: 700;
      color: #222;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .box {
      border: 1px solid #222;
      border-radius: 8px;
      padding: 10px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .field {
      margin-bottom: 8px;
    }

    .label {
      font-size: 10px;
      color: #555;
      margin-bottom: 2px;
    }

    .value {
      font-weight: 700;
      word-break: break-word;
    }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #555;
    }

    .badge.ok {
      background: #dff5df;
      color: #0e5d0e;
      border-color: #70b570;
    }

    .badge.nok {
      background: #fde2e2;
      color: #a11d1d;
      border-color: #e06b6b;
    }

    .badge.na {
      background: #fff4cc;
      color: #7a5a00;
      border-color: #e0bf57;
    }

    .worker-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .worker-chip {
      border: 1px solid #bbb;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 10px;
      background: #f8f8f8;
    }

    .worker-chip.encargado {
      background: #e8f1ff;
      border-color: #7da6e8;
      font-weight: 700;
    }

    .worker-tag {
      margin-left: 6px;
      color: #1d4ed8;
      font-size: 9px;
      font-weight: 700;
    }

    .actividad-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .actividad-table th,
    .actividad-table td {
      border: 1px solid #444;
      padding: 6px;
      vertical-align: top;
    }

    .actividad-table th {
      background: #f1f1f1;
      text-align: left;
    }

    .text-box {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 8px;
      margin-top: 8px;
      background: #fafafa;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .activity-detail {
      border: 1px solid #222;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .activity-detail-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    .activity-detail-title {
      font-size: 13px;
      font-weight: 700;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .evidence-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .evidence-box {
      border: 1px solid #333;
      border-radius: 8px;
      padding: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .evidence-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .photo-card {
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .photo-wrap {
      width: 100%;
      height: 180px;
      background: #eee;
    }

    .photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    .photo-caption {
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.2;
      min-height: 34px;
      border-top: 1px solid #ddd;
    }

    .correctivos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .correctivo-card {
      border: 1px solid #333;
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .correctivo-number {
      font-size: 10px;
      font-weight: 700;
      color: #555;
      margin-bottom: 6px;
    }

    .correctivo-text {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 8px;
      min-height: 38px;
      line-height: 1.35;
    }

    .correctivo-photo {
      width: 100%;
      height: 220px;
      background: #eee;
      border-radius: 6px;
      overflow: hidden;
    }

    .correctivo-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .empty-box {
      border: 1px dashed #999;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      color: #666;
      font-size: 10px;
      background: #fafafa;
    }

    .footer-box {
      display: grid;
      grid-template-columns: 1.2fr 1.2fr 0.6fr;
      gap: 10px;
    }

    .operativo-si {
      color: #0e5d0e;
      font-size: 18px;
      font-weight: 700;
    }

    .operativo-no {
      color: #a11d1d;
      font-size: 18px;
      font-weight: 700;
    }
  </style>
</head>

<body>
  <div class="header">
    <div>
      <div class="title">INFORME TÉCNICO</div>
      <div>Notificación: <b>${esc(n.id || "—")}</b></div>
    </div>
    <div class="meta">
      <div><b>OT:</b> ${esc(ot?.numeroOT ?? "—")}</div>
      <div><b>Generado:</b> ${esc(new Date().toLocaleString("es-PE"))}</div>
    </div>
  </div>

  <div class="section-title">Información del cliente</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField("Cliente", clienteNombre)}
      ${renderSimpleInfoField("RUC", clienteRuc)}
      ${renderSimpleInfoField("Correo", clienteCorreo)}
      ${renderSimpleInfoField("Teléfono", clienteTelefono)}
      ${renderSimpleInfoField("Orden de trabajo", ot?.numeroOT || "—")}
      ${renderSimpleInfoField("Estado OT", ot?.estado || "—")}
    </div>
  </div>

  <div class="section-title">Información del equipo</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField(
        esEquipo ? "Equipo" : "Ubicación técnica",
        esEquipo ? equipo?.nombre : ubicacion?.nombre
      )}
      ${renderSimpleInfoField(
        "Código",
        esEquipo ? equipo?.codigo : ubicacion?.codigo
      )}
      ${renderSimpleInfoField("Número equipo", n?.numeroEquipo || "—")}
      ${renderSimpleInfoField("Horómetro", n?.horometro || "—")}
      ${renderSimpleInfoField("Número de misiones", n?.numeroMisiones || "—")}
      ${renderSimpleInfoField(
        "Plan de mantenimiento",
        planOT?.nombre || planOT?.codigoPlan || "—"
      )}
    </div>
  </div>

  <div class="section-title">Trabajadores</div>
  <div class="box">
    <div class="field">
      <div class="label">Encargado OT</div>
      <div class="value">${esc(encargadoNombre)}</div>
    </div>
    <div class="worker-list">
      ${trabajadoresHtml}
    </div>
  </div>

  <div class="section-title">Información del mantenimiento</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField("Tipo de mantenimiento", tipoMantenimiento)}
      ${renderSimpleInfoField("Fecha inicio", fmtDate(n?.fechaInicio))}
      ${renderSimpleInfoField("Fecha fin", fmtDate(n?.fechaFin))}
      ${renderSimpleInfoField(
        "Último mantenimiento preventivo",
        fmtDate(n?.fechaUltimoMantenimientoPreventivo)
      )}
      ${renderSimpleInfoField("Estado notificación", n?.estado || "—")}
      ${renderSimpleInfoField("Estado general equipo", n?.estadoGeneralEquipo || "—")}
    </div>
  </div>

  <div class="section-title">Lista de actividades</div>
  <table class="actividad-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Sistema</th>
        <th>Subsistema</th>
        <th>Componente</th>
        <th>Actividad</th>
        <th>Tipo trabajo</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${actividadesResumenHtml}
    </tbody>
  </table>

  <div class="section-title">Descripción</div>
  <div class="box">
    ${esc(n.descripcionMantenimiento || n.descripcionGeneral || "—")}
  </div>

  <div class="section-title">Detalle de actividades</div>
  ${actividadesDetalleHtml}

  <div class="section-title">Cierre</div>
  <div class="footer-box">
    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">Observaciones</h3>
      <div>${esc(n.observaciones || "—")}</div>
    </div>

    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">Recomendaciones</h3>
      <div>${esc(n.recomendaciones || "—")}</div>
    </div>

    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">Equipo operativo</h3>
      <div class="${equipoOperativo === "SI" ? "operativo-si" : "operativo-no"}">
        ${esc(equipoOperativo)}
      </div>
    </div>
  </div>
</body>
</html>
`;
}

async function renderNotificacionPdfBuffer(notificacion) {
  if (!notificacion) {
    throw new Error("Notificación no encontrada para PDF");
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setBypassCSP(true);

    const html = buildHtml(notificacion);

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "14mm",
        left: "12mm",
      },
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="font-size:9px;width:100%;padding:0 12mm;color:#444;display:flex;justify-content:space-between;">
          <span>INFORME TÉCNICO</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = {
  renderNotificacionPdfBuffer,
};