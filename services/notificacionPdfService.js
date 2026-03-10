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

const CATEGORIAS_FOTO = new Set(["ANTES", "DESPUES", "CORRECTIVO"]);
const CATEGORIAS_DOC = new Set(["ACTA_CONFORMIDAD", "INFORME", "CHECKLIST", "OTRO"]);

const getNombreTecnico = (t) =>
  t?.nombreApellido ||
  t?.nombreCompleto ||
  t?.nombre ||
  t?.alias ||
  t?.usuario ||
  "—";

const agruparAdjuntosPorCategoria = (adjuntos = []) => {
  const base = {
    ANTES: [],
    DESPUES: [],
    CORRECTIVO: [],
  };

  for (const adj of adjuntos || []) {
    if (!adj?.categoria) continue;
    if (!CATEGORIAS_FOTO.has(adj.categoria)) continue;

    const src = fileToBase64DataUrl(adj.url) || adj.url || null;
    if (!src) continue;

    base[adj.categoria].push({
      id: adj.id,
      nombre: adj.nombre || "",
      categoria: adj.categoria,
      src,
    });
  }

  return base;
};

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
                <div class="photo-caption">${esc(f.nombre || f.categoria || "Imagen")}</div>
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

function buildHtml(notificacion) {
  const n = notificacion;
  const ot = n?.ordenTrabajo;
  const equipoOT = n?.equipoOT;
  const equipo = equipoOT?.equipo || null;
  const ubicacion = equipoOT?.ubicacionTecnica || null;
  const planOT = equipoOT?.planMantenimiento || null;

  const esEquipo = !!equipo;
  const esUbicacion = !!ubicacion;

  const trabajadoresOT = n?.equipoOT?.trabajadores || [];

const encargadoOT =
  trabajadoresOT.find((t) => t?.esEncargado)?.trabajador || null;

const encargadoNombre = encargadoOT
  ? (encargadoOT.nombreApellido ||
     encargadoOT.nombreCompleto ||
     encargadoOT.nombre ||
     encargadoOT.alias ||
     "—")
  : "—";


  const trabajadoresOTTexto =
  trabajadoresOT.length > 0
    ? trabajadoresOT
        .map((tw) => {
          const tr = tw?.trabajador;
          const nombre =
            tr?.nombreApellido ||
            tr?.nombreCompleto ||
            tr?.nombre ||
            tr?.alias ||
            tr?.usuario ||
            "—";

          return tw?.esEncargado ? `${nombre} (Encargado)` : nombre;
        })
        .join(", ")
    : "—";

  const tecnicosTexto =
    (n?.tecnicos || []).length > 0
      ? n.tecnicos.map((t) => esc(getNombreTecnico(t))).join(", ")
      : "—";

  const targetHtml = esEquipo
    ? `
      <div class="box">
        <h3>Equipo intervenido</h3>
        <div class="row">
          <div class="field">
            <div class="label">Nombre</div>
            <div class="value">${esc(equipo?.nombre ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Código</div>
            <div class="value">${esc(equipo?.codigo ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Número equipo</div>
            <div class="value">${esc(n.numeroEquipo ?? "—")}</div>
          </div>
        </div>
        <div class="row" style="margin-top:6px">
          <div class="field">
            <div class="label">Horómetro</div>
            <div class="value">${esc(n.horometro ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Misiones</div>
            <div class="value">${esc(n.numeroMisiones ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Plan OT</div>
            <div class="value">${esc(planOT?.nombre ?? planOT?.codigoPlan ?? "—")}</div>
          </div>
        </div>
      </div>
    `
    : `
      <div class="box">
        <h3>Ubicación técnica intervenida</h3>
        <div class="row">
          <div class="field">
            <div class="label">Nombre</div>
            <div class="value">${esc(ubicacion?.nombre ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Código</div>
            <div class="value">${esc(ubicacion?.codigo ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Número equipo</div>
            <div class="value">${esc(n.numeroEquipo ?? "—")}</div>
          </div>
        </div>
        <div class="row" style="margin-top:6px">
          <div class="field">
            <div class="label">Horómetro</div>
            <div class="value">${esc(n.horometro ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Misiones</div>
            <div class="value">${esc(n.numeroMisiones ?? "—")}</div>
          </div>
          <div class="field">
            <div class="label">Plan OT</div>
            <div class="value">${esc(planOT?.nombre ?? planOT?.codigoPlan ?? "—")}</div>
          </div>
        </div>
      </div>
    `;

  const planesHtml = (n?.planes || []).map((p, index) => {
    const act = p?.actividad;
    const tecnico = p?.trabajador ? getNombreTecnico(p.trabajador) : "—";
    const estado = p?.estado || "NO_APLICA";
    const badgeClass =
      estado === "OK" ? "ok" : estado === "NO_OK" ? "no" : "na";

    const adjuntosActividad = agruparAdjuntosPorCategoria(p?.adjuntos || []);

    return `
      <div class="activity-block">
        <div class="activity-header">
          <div class="activity-title">Actividad ${index + 1}</div>
          <div><span class="badge ${badgeClass}">${esc(estado)}</span></div>
        </div>

        <div class="activity-grid">
          <div class="field"><div class="label">Sistema</div><div class="value">${esc(act?.sistema ?? "—")}</div></div>
          <div class="field"><div class="label">Subsistema</div><div class="value">${esc(act?.subsistema ?? "—")}</div></div>
          <div class="field"><div class="label">Componente</div><div class="value">${esc(act?.componente ?? "—")}</div></div>
          <div class="field"><div class="label">Actividad</div><div class="value">${esc(act?.tarea ?? "—")}</div></div>
          <div class="field"><div class="label">Tipo trabajo</div><div class="value">${esc(act?.tipoTrabajo ?? "—")}</div></div>
          <div class="field"><div class="label">Técnico</div><div class="value">${esc(tecnico)}</div></div>
          <div class="field"><div class="label">Fecha inicio</div><div class="value">${esc(fmtDate(p?.fechaInicioPlan))}</div></div>
          <div class="field"><div class="label">Fecha fin</div><div class="value">${esc(fmtDate(p?.fechaFinPlan))}</div></div>
          <div class="field"><div class="label">Duración</div><div class="value">${esc(fmtDuracion(p?.duracionPlan, p?.unidadDuracionPlan))}</div></div>
          <div class="field"><div class="label">Comentario</div><div class="value">${esc(p?.comentario ?? "—")}</div></div>
          <div class="field full"><div class="label">Observaciones</div><div class="value">${esc(p?.observaciones ?? "—")}</div></div>
        </div>

        <div class="activity-evidence">
          ${renderPhotoBox("Antes", adjuntosActividad.ANTES)}
          ${renderPhotoBox("Después", adjuntosActividad.DESPUES)}
          ${renderPhotoBox("Correctivo", adjuntosActividad.CORRECTIVO)}
        </div>
      </div>
    `;
  });

  const fotosGenerales = agruparAdjuntosPorCategoria(
    (n?.adjuntos || []).filter((a) => !CATEGORIAS_DOC.has(a?.categoria))
  );

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 14mm 12mm; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
    }

    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 6px;
    }

    .title { font-size: 16px; font-weight: 700; }
    .meta { text-align:right; font-size: 10px; }

    .section { margin-top: 12px; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .box {
      border: 1px solid #222;
      padding: 8px;
      border-radius: 6px;
      background: #fff;
    }

    .box h3 {
      margin: 0 0 6px 0;
      font-size: 12px;
    }

    .row {
      display:flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .field {
      flex:1;
      min-width: 150px;
    }

    .field.full {
      flex: 1 1 100%;
      min-width: 100%;
    }

    .label {
      font-size: 10px;
      color:#444;
      margin-bottom: 2px;
    }

    .value {
      font-weight: 700;
      margin-top: 2px;
      word-break: break-word;
    }

    .badge {
      display:inline-block;
      padding:2px 8px;
      border-radius:999px;
      border:1px solid #222;
      font-size:10px;
      font-weight:700;
      background:#f4f4f4;
    }

    .badge.ok { background:#e9f7ef; }
    .badge.no { background:#fdecea; }
    .badge.na { background:#f3f3f3; }

    .activity-block {
      border: 1px solid #222;
      border-radius: 8px;
      padding: 10px;
      margin-top: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #fff;
    }

    .activity-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
    }

    .activity-title {
      font-size: 13px;
      font-weight: 700;
    }

    .activity-grid {
      display:grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .activity-evidence {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr;
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
      display:grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .photo-card {
      border:1px solid #333;
      border-radius:8px;
      overflow:hidden;
      background:#fff;
      break-inside:avoid;
      page-break-inside:avoid;
    }

    .photo-wrap {
      width:100%;
      height:180px;
      background:#eee;
    }

    .photo-wrap img {
      width:100%;
      height:100%;
      object-fit:cover;
      object-position:center;
      display:block;
    }

    .photo-caption {
      padding:6px 8px;
      font-size:10px;
      line-height:1.2;
      min-height: 34px;
      border-top: 1px solid #ddd;
    }

    .empty-box {
      border: 1px dashed #999;
      border-radius: 6px;
      padding: 18px;
      text-align: center;
      color: #666;
      font-size: 10px;
      background: #fafafa;
    }

    .section-title {
      margin: 16px 0 8px 0;
      font-size: 14px;
      font-weight: 700;
      border-bottom: 2px solid #111;
      padding-bottom: 4px;
    }
  </style>
</head>

<body>
  <div class="header">
    <div>
      <div class="title">INFORME TÉCNICO</div>
      <div>Notificación: <b>${esc(n.id)}</b></div>
    </div>
    <div class="meta">
      <div><b>OT:</b> ${esc(ot?.numeroOT ?? "—")}</div>
      <div><b>Generado:</b> ${esc(new Date().toLocaleString("es-PE"))}</div>
    </div>
  </div>

  <div class="section grid2">
    <div class="box">
      <h3>Información OT</h3>
      <div class="row">
        <div class="field">
          <div class="label">OT</div>
          <div class="value">${esc(ot?.numeroOT ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Estado OT</div>
          <div class="value">${esc(ot?.estado ?? "—")}</div>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="field">
          <div class="label">Fecha inicio notificación</div>
          <div class="value">${esc(fmtDate(n.fechaInicio))}</div>
        </div>
        <div class="field">
          <div class="label">Fecha fin notificación</div>
          <div class="value">${esc(fmtDate(n.fechaFin))}</div>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="field">
          <div class="label">Estado general</div>
          <div class="value">${esc(n.estadoGeneralEquipo ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Estado notificación</div>
          <div class="value">${esc(n.estado ?? "—")}</div>
        </div>
      </div>
    </div>

    ${targetHtml}
  </div>

  <div class="section grid2">
  <div class="box">
    <h3>Técnicos</h3>

    <div class="row">
      <div class="field">
        <div class="label">Encargado OT</div>
        <div class="value">${esc(encargadoNombre)}</div>
      </div>
    </div>

    <div class="row" style="margin-top:6px">
      <div class="field">
        <div class="label">Técnicos de la notificación</div>
        <div class="value">${tecnicosTexto}</div>
      </div>
    </div>

    <div class="row" style="margin-top:6px">
      <div class="field">
        <div class="label">Trabajadores OT</div>
        <div class="value">${esc(trabajadoresOTTexto)}</div>
      </div>
    </div>
  </div>

  <div class="box">
    <h3>Datos adicionales</h3>
    <div class="row">
      <div class="field">
        <div class="label">Último preventivo</div>
        <div class="value">${esc(fmtDate(n.fechaUltimoMantenimientoPreventivo))}</div>
      </div>
      <div class="field">
        <div class="label">Código repuesto</div>
        <div class="value">${esc(n.codigoRepuesto ?? "—")}</div>
      </div>
    </div>
  </div>
</div>

  <div class="section grid2">
    <div class="box">
      <h3>Descripción de mantenimiento</h3>
      <div>${esc(n.descripcionMantenimiento || n.descripcionGeneral || "—")}</div>
    </div>
    <div class="box">
      <h3>Resumen correctivos</h3>
      <div>${esc(n.resumenCorrectivos || "—")}</div>
    </div>
  </div>

  <div class="section grid2">
    <div class="box">
      <h3>Observaciones</h3>
      <div>${esc(n.observaciones || "—")}</div>
    </div>
    <div class="box">
      <h3>Recomendaciones</h3>
      <div>${esc(n.recomendaciones || "—")}</div>
    </div>
  </div>

  <div class="section-title">Actividades ejecutadas</div>
  ${
    planesHtml.length
      ? planesHtml.join("")
      : `<div class="box">Sin actividades registradas</div>`
  }

  <div class="section-title">Evidencias generales de la notificación</div>
  <div class="activity-evidence">
    ${renderPhotoBox("Antes Notificación", fotosGenerales.ANTES)}
    ${renderPhotoBox("Después Notificación", fotosGenerales.DESPUES)}
    ${renderPhotoBox("Correctivo Notificación", fotosGenerales.CORRECTIVO)}
  </div>

</body>
</html>
`;
}

async function renderNotificacionPdfBuffer(notificacion) {
  if (!notificacion) throw new Error("Notificación no encontrada para PDF");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setBypassCSP(true);

    const html = buildHtml(notificacion);
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
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

module.exports = { renderNotificacionPdfBuffer };