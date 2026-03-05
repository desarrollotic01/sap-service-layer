const puppeteer = require("puppeteer");

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const fmtDate = (d) => (d ? new Date(d).toLocaleString("es-PE") : "—");

// ❌ NO se imprime en el PDF (documentos)
const CATEGORIAS_FOTO = new Set(["ANTES", "DESPUES", "CORRECTIVO"]);
const EXCLUIR_EN_PDF = new Set(["ACTA_CONFORMIDAD", "INFORME", "CHECKLIST", "OTRO"]);

function buildHtml(notificacion) {
  const n = notificacion; // por si te gusta n
  const ot = n?.ordenTrabajo;
  const equipo = n?.equipoOT?.equipo;

  // ✅ actividades: planes (NotificacionPlan) + actividad (OrdenTrabajoEquipoActividad)
  const planesRows = (n?.planes || []).map((p) => {
    const act = p?.actividad;
    const st = p?.estado || "NO_APLICA";

    const rowClass = st === "OK" ? "ok-row" : st === "NO_OK" ? "no-row" : "na-row";
    const badgeClass = st === "OK" ? "ok" : st === "NO_OK" ? "no" : "na";

    return `
      <tr class="${rowClass}">
        <td>${esc(act?.sistema ?? "")}</td>
        <td>${esc(act?.subsistema ?? "")}</td>
        <td>${esc(act?.componente ?? "")}</td>
        <td>${esc(act?.tarea ?? "")}</td>
        <td class="center"><span class="badge ${badgeClass}">${esc(st)}</span></td>
        <td>${esc(p?.comentario ?? "")}</td>
      </tr>
    `;
  });

  // ✅ fotos: solo categorías foto, y excluir docs
  const fotos = (n?.adjuntos || [])
    .filter((a) => a?.categoria && !EXCLUIR_EN_PDF.has(a.categoria))
    .filter((a) => CATEGORIAS_FOTO.has(a.categoria))
    .map((a) => ({
      url: a.url,
      desc: a.nombre || "",
      categoria: a.categoria,
      extension: a.extension || null,
    }))
    .filter((x) => !!x.url);

  const fotosCards = fotos.map(
    (f) => `
    <div class="photo-card">
      <div class="photo-wrap">
        <img src="${esc(f.url)}" />
      </div>
      <div class="photo-meta">
        <div class="tag">${esc(f.categoria)}</div>
        <div class="desc">${esc(f.desc)}</div>
      </div>
    </div>
  `
  );

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 14mm 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }

    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #111; padding-bottom: 6px; }
    .title { font-size: 16px; font-weight: 700; }
    .meta { text-align:right; font-size: 10px; }

    .section { margin-top: 10px; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .box { border: 1px solid #222; padding: 8px; border-radius: 6px; }
    .box h3 { margin: 0 0 6px 0; font-size: 12px; }

    .row { display:flex; gap: 8px; flex-wrap: wrap; }
    .field { flex:1; min-width: 160px; }
    .label { font-size: 10px; color:#444; }
    .value { font-weight: 700; margin-top: 2px; }

    table { width:100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 5px; vertical-align: top; }
    th { background: #f2f2f2; font-size: 10px; text-transform: uppercase; }
    .center { text-align:center; }

    .badge{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #222;font-size:10px;font-weight:700}
    .badge.ok{background:#e9f7ef}
    .badge.no{background:#fdecea}
    .badge.na{background:#f3f3f3}
    tr.ok-row td{background:#fbfffc}
    tr.no-row td{background:#fff9f9}
    tr.na-row td{background:#fcfcfc}

    /* ✅ FOTOS UNIFORMES */
    .photos-grid{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }

    .photo-card{
      border:1px solid #333;
      border-radius:8px;
      overflow:hidden;
      break-inside:avoid;
      page-break-inside:avoid;
      background:#fff;
    }

    .photo-wrap{
      width:100%;
      height:210px;
      background:#eee;
    }

    .photo-wrap img{
      width:100%;
      height:100%;
      object-fit:cover;
      object-position:center;
      display:block;
    }

    .photo-meta{
      padding:6px 8px;
      display:flex;
      gap:8px;
      align-items:flex-start;
    }
    .tag{
      font-size:9px;
      font-weight:700;
      border:1px solid #222;
      padding:2px 6px;
      border-radius:999px;
      white-space:nowrap;
    }
    .desc{
      font-size:10px;
      line-height:1.2;
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
    </div>

    <div class="box">
      <h3>Equipo</h3>
      <div class="row">
        <div class="field">
          <div class="label">Nombre</div>
          <div class="value">${esc(equipo?.nombre ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Código</div>
          <div class="value">${esc(equipo?.codigo ?? "—")}</div>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="field">
          <div class="label">Número equipo</div>
          <div class="value">${esc(n.numeroEquipo ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Horómetro</div>
          <div class="value">${esc(n.horometro ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Misiones</div>
          <div class="value">${esc(n.numeroMisiones ?? "—")}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section grid2">
    <div class="box">
      <h3>Fechas y Estado</h3>
      <div class="row">
        <div class="field">
          <div class="label">Inicio</div>
          <div class="value">${esc(fmtDate(n.fechaInicio))}</div>
        </div>
        <div class="field">
          <div class="label">Fin</div>
          <div class="value">${esc(fmtDate(n.fechaFin))}</div>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="field">
          <div class="label">Estado general del equipo</div>
          <div class="value">${esc(n.estadoGeneralEquipo ?? "—")}</div>
        </div>
        <div class="field">
          <div class="label">Estado notificación</div>
          <div class="value">${esc(n.estado ?? "—")}</div>
        </div>
      </div>
      <div class="row" style="margin-top:6px">
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

    <div class="box">
      <h3>Técnicos</h3>
      <div>
        ${(n?.tecnicos || []).length
          ? (n.tecnicos
              .map((t) => esc(t?.nombreApellido ?? t?.nombre ?? t?.alias ?? ""))
              .filter(Boolean)
              .join(", "))
          : "—"}
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

  <div class="section box">
    <h3>Actividades / Cumplimiento</h3>
    <table>
      <thead>
        <tr>
          <th>Sistema</th>
          <th>Sub-sistema</th>
          <th>Componente</th>
          <th>Actividad</th>
          <th>Estado</th>
          <th>Comentario</th>
        </tr>
      </thead>
      <tbody>
        ${planesRows.length ? planesRows.join("") : `<tr><td colspan="6">Sin actividades registradas</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="photos">
    <h3>Reporte Fotográfico</h3>
    <div class="photos-grid">
      ${fotosCards.length ? fotosCards.join("") : `<div>Sin fotos</div>`}
    </div>
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