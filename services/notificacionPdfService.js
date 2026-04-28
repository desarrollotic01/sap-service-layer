const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// ─── Helpers ────────────────────────────────────────────────────────────────

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

    const base64 = fs.readFileSync(absolutePath).toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
};

// Load ALSUD logo once at module level
const LOGO_BASE64 = fileToBase64DataUrl("assets/logo-Alsud.png");

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

// ─── Photo helpers ───────────────────────────────────────────────────────────

const resolveAdjuntoSrc = (adj) =>
  fileToBase64DataUrl(adj.url) || adj.url || null;

const getAdjuntosByCategoria = (adjuntos = [], ...categorias) => {
  const set = new Set(categorias);
  const result = [];
  for (const adj of adjuntos || []) {
    if (!adj?.categoria || !set.has(adj.categoria)) continue;
    const src = resolveAdjuntoSrc(adj);
    if (!src) continue;
    // toJSON() extrae un objeto plano con todos los dataValues (grupo, descripcion, etc.)
    const plain = typeof adj.toJSON === "function" ? adj.toJSON() : { ...adj };
    result.push({ ...plain, src });
  }
  return result;
};

// Groups photos by grupo field → [ { descripcion, fotos[] } ]
// Recibe objetos ya planos (resultado de getAdjuntosByCategoria con toJSON)
const groupAdjuntosByGrupo = (adjuntos) => {
  const map = new Map();
  for (const f of adjuntos) {
    const g = f.grupo ?? 0;
    if (!map.has(g)) map.set(g, { descripcion: f.descripcion || "", fotos: [] });
    map.get(g).fotos.push(f);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, v]) => v);
};

// ─── Render helpers ──────────────────────────────────────────────────────────

const renderSimpleInfoField = (label, value) => `
  <div class="field">
    <div class="label">${esc(label)}</div>
    <div class="value">${esc(value ?? "—")}</div>
  </div>
`;

const renderPhotoGrid = (fotos = []) => {
  if (!fotos.length) {
    return `<div class="empty-box">Sin imágenes</div>`;
  }
  return `
    <div class="photo-grid">
      ${fotos
        .map(
          (f) => `
        <div class="photo-card">
          <div class="photo-wrap">
            <img src="${esc(f.src)}" alt="${esc(f.nombre || "")}" />
          </div>
        </div>
      `
        )
        .join("")}
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
        ${renderSimpleInfoField("Duración", fmtDuracion(p?.duracionPlan, p?.unidadDuracionPlan))}
        ${renderSimpleInfoField("Fecha inicio", fmtDate(p?.fechaInicioPlan))}
        ${renderSimpleInfoField("Fecha fin", fmtDate(p?.fechaFinPlan))}
      </div>

      ${
        p?.comentario
          ? `<div class="text-box">
              <div class="label">Comentario</div>
              <div>${esc(p.comentario)}</div>
            </div>`
          : ""
      }
      ${
        p?.observaciones
          ? `<div class="text-box">
              <div class="label">Observaciones de actividad</div>
              <div>${esc(p.observaciones)}</div>
            </div>`
          : ""
      }
    </div>
  `;
};

// ─── Build HTML ──────────────────────────────────────────────────────────────

function buildHtml(notificacion) {
  const n = notificacion || {};
  const ot = n?.ordenTrabajo || {};
  const equipoOT = n?.equipoOT || {};
  const equipo = equipoOT?.equipo || null;
  const ubicacion = equipoOT?.ubicacionTecnica || null;
  const planOT = equipoOT?.planMantenimiento || n?.planes?.[0]?.plan || null;
  const esEquipo = !!equipo;

  const trabajadoresOT = Array.isArray(n?.equipoOT?.trabajadores)
    ? n.equipoOT.trabajadores
    : [];
  const encargadoOT =
    trabajadoresOT.find((t) => t?.esEncargado)?.trabajador || null;
  const encargadoNombre = encargadoOT ? getNombreTecnico(encargadoOT) : "—";

  const trabajadoresHtml =
    trabajadoresOT.length > 0
      ? trabajadoresOT
          .map(
            (tw) => `
            <div class="worker-chip ${tw?.esEncargado ? "encargado" : ""}">
              ${esc(getNombreTecnico(tw?.trabajador))}
              ${tw?.esEncargado ? `<span class="worker-tag">ENCARGADO</span>` : ""}
            </div>
          `
          )
          .join("")
      : `<div class="empty-box">Sin trabajadores registrados</div>`;

  const aviso = ot?.aviso || null;
  const tipoAviso = aviso?.tipoAviso || ot?.tipoAviso || "";
  const esInstalacionPdf = tipoAviso === "instalacion";
  const esVentaPdf = tipoAviso === "venta";
  const esMantenimientoPdf = !esInstalacionPdf && !esVentaPdf;

  // Etiquetas según tipo
  const tituloDoc = esInstalacionPdf
    ? "INFORME DE INSTALACIÓN"
    : esVentaPdf
    ? "INFORME DE ENTREGA"
    : "INFORME TÉCNICO";
  const labelTipo = esInstalacionPdf ? "Instalación" : esVentaPdf ? "Entrega" : "Mantenimiento";
  const labelSeccionInfo = esInstalacionPdf
    ? "Información de la instalación"
    : esVentaPdf
    ? "Información de la entrega"
    : "Información del mantenimiento";
  const labelFotoSeccion = esInstalacionPdf
    ? "Evidencia fotográfica — Instalación"
    : esVentaPdf
    ? "Evidencia fotográfica — Entrega"
    : "Evidencia fotográfica — Antes y Después";
  const labelDescripcion = esInstalacionPdf
    ? "Descripción de la instalación"
    : esVentaPdf
    ? "Descripción de la entrega"
    : "Descripción del mantenimiento";
  const footerLabel = esInstalacionPdf
    ? "INFORME DE INSTALACIÓN — ALSUD"
    : esVentaPdf
    ? "INFORME DE ENTREGA — ALSUD"
    : "INFORME TÉCNICO — ALSUD";

  const supervisorNombrePdf =
    ot?.supervisor?.nombre ||
    ot?.supervisorNombre ||
    (ot?.supervisorId ? `ID: ${ot.supervisorId}` : "—");

  const clienteNombre =
    ot?.cliente?.razonSocial || n?.cliente?.razonSocial || n?.clienteNombre || "—";
  const clienteRuc = ot?.cliente?.ruc || n?.cliente?.ruc || "—";
  const clienteCorreo =
    aviso?.correoContacto || ot?.cliente?.correo || n?.cliente?.correo || "—";
  const clienteTelefono =
    aviso?.numeroContacto || ot?.cliente?.telefono || n?.cliente?.telefono || "—";
  const clienteContacto = aviso?.nombreContacto || "—";

  const tipoMantenimiento = getTipoMantenimientoLabel(n);
  const actividades = Array.isArray(n?.planes) ? n.planes : [];
  const adjuntosNotificacion = Array.isArray(n?.adjuntos) ? n.adjuntos : [];

  // ─── Top-level photos (ANTES / DESPUES) grouped by `grupo` ─────────────
  console.log("[PDF] adjuntos totales:", adjuntosNotificacion.length,
    adjuntosNotificacion.map(a => ({ cat: a.categoria, grupo: a.grupo, desc: a.descripcion, id: a.id }))
  );

  const fotosAntes = getAdjuntosByCategoria(adjuntosNotificacion, "ANTES");
  const fotosDespues = getAdjuntosByCategoria(adjuntosNotificacion, "DESPUES");
  const hayFotos = fotosAntes.length > 0 || fotosDespues.length > 0;

  // Merge antes+después into grouped pairs by grupo
  const gruposAntesDespues = (() => {
    const map = new Map();
    for (const f of fotosAntes) {
      const g = f.grupo ?? 0;
      if (!map.has(g)) map.set(g, { descripcion: f.descripcion || "", antes: [], despues: [] });
      map.get(g).antes.push(f);
    }
    for (const f of fotosDespues) {
      const g = f.grupo ?? 0;
      if (!map.has(g)) map.set(g, { descripcion: f.descripcion || "", antes: [], despues: [] });
      map.get(g).despues.push(f);
    }
    const result = Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, v]) => v);
    console.log("[PDF] gruposAntesDespues:", result.map(g => ({ desc: g.descripcion, antes: g.antes.length, despues: g.despues.length })));
    return result;
  })();

  // ─── Correctivos grouped by `grupo` ─────────────────────────────────────
  const fotosCorrectivos = getAdjuntosByCategoria(adjuntosNotificacion, "CORRECTIVO");
  const hayCorrectivos = fotosCorrectivos.length > 0 || !!n?.resumenCorrectivos;
  const gruposCorrectivos = groupAdjuntosByGrupo(fotosCorrectivos);

  const actividadesResumenHtml = actividades.length
    ? actividades.map(renderActividadResumenRow).join("")
    : `<tr><td colspan="7">Sin actividades registradas</td></tr>`;

  const actividadesDetalleHtml = actividades.length
    ? actividades.map(renderActividadDetalle).join("")
    : `<div class="box">Sin actividades registradas</div>`;

  const equipoOperativo =
    String(n?.estadoGeneralEquipo || "").toUpperCase() === "INOPERATIVO" ? "NO" : "SI";

  const logoHtml = LOGO_BASE64
    ? `<img src="${LOGO_BASE64}" class="header-logo" alt="ALSUD" />`
    : `<div class="header-logo-text">ALSUD</div>`;

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
      margin: 0;
      padding: 0;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .header-logo {
      height: 80px;
      width: auto;
      object-fit: contain;
    }

    .header-logo-text {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #1a3060;
    }

    .header-right {
      text-align: right;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
    }

    .meta {
      font-size: 10px;
      line-height: 1.6;
      margin-top: 4px;
    }

    /* ── Sections ── */
    .section-title {
      margin: 16px 0 8px 0;
      font-size: 13px;
      font-weight: 700;
      border-bottom: 2px solid #111;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Layout boxes ── */
    .box {
      border: 1px solid #222;
      border-radius: 8px;
      padding: 10px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .field { margin-bottom: 8px; }

    .label {
      font-size: 10px;
      color: #555;
      margin-bottom: 2px;
    }

    .value { font-weight: 700; word-break: break-word; }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #555;
    }
    .badge.ok { background: #dff5df; color: #0e5d0e; border-color: #70b570; }
    .badge.nok { background: #fde2e2; color: #a11d1d; border-color: #e06b6b; }
    .badge.na { background: #fff4cc; color: #7a5a00; border-color: #e0bf57; }

    /* ── Workers ── */
    .worker-list { display: flex; flex-wrap: wrap; gap: 8px; }
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
    .worker-tag { margin-left: 6px; color: #1d4ed8; font-size: 9px; font-weight: 700; }

    /* ── Activities table ── */
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
    .actividad-table th { background: #f1f1f1; text-align: left; }

    /* ── Activity detail ── */
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
    .activity-detail-title { font-size: 13px; font-weight: 700; }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
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

    /* ── Photos ── */
    .antes-despues-grupo {
      margin-bottom: 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .grupo-descripcion {
      font-size: 11px;
      font-weight: 700;
      color: #1a3060;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 8px;
    }

    .photo-section-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .photo-group {
      border: 1px solid #333;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
    }

    .photo-group-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .photo-card {
      border: 1px solid #ccc;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .photo-wrap {
      width: 100%;
      height: 380px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      display: block;
    }

    .photo-caption {
      padding: 5px 8px;
      font-size: 10px;
      line-height: 1.3;
      border-top: 1px solid #eee;
      background: #fff;
    }

    /* ── Correctivos ── */
    .correctivo-section {
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .correctivo-grupo {
      margin-bottom: 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .correctivo-grupo-desc {
      font-size: 11px;
      font-weight: 700;
      color: #7a3e00;
      background: #fdf8ec;
      border: 1px solid #e5c97a;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .correctivo-photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .correctivo-photo-card {
      border: 1px solid #ccc;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .correctivo-photo-wrap {
      width: 100%;
      height: 380px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .correctivo-photo-wrap img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      display: block;
    }

    /* ── Cierre ── */
    .footer-box {
      display: grid;
      grid-template-columns: 1.2fr 1.2fr 0.6fr;
      gap: 10px;
    }

    .footer-box-simple {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .operativo-si { color: #0e5d0e; font-size: 18px; font-weight: 700; }
    .operativo-no { color: #a11d1d; font-size: 18px; font-weight: 700; }

    .empty-box {
      border: 1px dashed #999;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      color: #666;
      font-size: 10px;
      background: #fafafa;
    }
  </style>
</head>

<body>
  <!-- HEADER -->
  <div class="header">
    ${logoHtml}
    <div class="header-right">
      <div class="title">${tituloDoc}</div>
      <div class="meta">
        <div>Notificación: <b>${esc(n.id || "—")}</b></div>
        <div><b>OT:</b> ${esc(ot?.numeroOT ?? "—")}</div>
        <div><b>Generado:</b> ${esc(new Date().toLocaleString("es-PE"))}</div>
      </div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="section-title">Información del cliente</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField("Cliente", clienteNombre)}
      ${renderSimpleInfoField("RUC", clienteRuc)}
      ${renderSimpleInfoField("Contacto", clienteContacto)}
      ${renderSimpleInfoField("Correo", clienteCorreo)}
      ${renderSimpleInfoField("Teléfono", clienteTelefono)}
      ${renderSimpleInfoField("Orden de trabajo", ot?.numeroOT || "—")}
    </div>
  </div>

  <!-- EQUIPO -->
  <div class="section-title">${esInstalacionPdf ? "Información del equipo instalado" : esVentaPdf ? "Información del equipo entregado" : "Información del equipo"}</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField(
        esEquipo ? "Equipo" : "Ubicación técnica",
        esEquipo ? equipo?.nombre : ubicacion?.nombre
      )}
      ${renderSimpleInfoField("Código", esEquipo ? equipo?.codigo : ubicacion?.codigo)}
      ${esMantenimientoPdf ? renderSimpleInfoField("Id - Cliente", n?.numeroEquipo || "—") : ""}
      ${esMantenimientoPdf && esEquipo ? renderSimpleInfoField("Horómetro", n?.horometro || "—") : ""}
      ${esMantenimientoPdf && esEquipo ? renderSimpleInfoField("Número de misiones", n?.numeroMisiones || "—") : ""}
      ${esMantenimientoPdf ? renderSimpleInfoField("Plan de mantenimiento", planOT?.nombre || planOT?.codigoPlan || "—") : ""}
    </div>
  </div>

  <!-- TRABAJADORES -->
  <div class="section-title">Trabajadores</div>
  <div class="box">
    <div class="field">
      <div class="label">Encargado OT</div>
      <div class="value">${esc(encargadoNombre)}</div>
    </div>
    <div class="worker-list">${trabajadoresHtml}</div>
  </div>

  <!-- INFO SEGUN TIPO -->
  <div class="section-title">${labelSeccionInfo}</div>
  <div class="box">
    <div class="grid-3">
      ${renderSimpleInfoField("Supervisor", supervisorNombrePdf)}
      ${esMantenimientoPdf ? renderSimpleInfoField("Tipo de mantenimiento", tipoMantenimiento) : ""}
      ${renderSimpleInfoField(esInstalacionPdf ? "Fecha de inicio de instalación" : esVentaPdf ? "Fecha de entrega" : "Fecha inicio", fmtDate(n?.fechaInicio))}
      ${renderSimpleInfoField(esInstalacionPdf ? "Fecha de fin de instalación" : esVentaPdf ? "Fecha de recepción" : "Fecha fin", fmtDate(n?.fechaFin))}
      ${esMantenimientoPdf ? renderSimpleInfoField("Último mant. preventivo", fmtDate(n?.fechaUltimoMantenimientoPreventivo)) : ""}
      ${esMantenimientoPdf ? renderSimpleInfoField("Estado general del equipo", n?.estadoGeneralEquipo || "—") : ""}
    </div>
  </div>

  <!-- LISTA DE ACTIVIDADES (solo mantenimiento e instalación) -->
  ${!esVentaPdf ? `
  <div class="section-title">${esInstalacionPdf ? "Actividades de instalación" : "Lista de actividades"}</div>
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
    <tbody>${actividadesResumenHtml}</tbody>
  </table>

  <!-- DETALLE DE ACTIVIDADES -->
  <div class="section-title">${esInstalacionPdf ? "Detalle de actividades de instalación" : "Detalle de actividades"}</div>
  ${actividadesDetalleHtml}
  ` : ""}

  <!-- DESCRIPCIÓN -->
  <div class="section-title">${labelDescripcion}</div>
  <div class="box">
    ${esc(n.descripcionMantenimiento || n.descripcionGeneral || "—")}
  </div>

  <!-- EVIDENCIA FOTOGRÁFICA -->
  <div class="section-title">${labelFotoSeccion}</div>
  ${
    hayFotos
      ? gruposAntesDespues.map((g, gi) => `
  <div class="antes-despues-grupo" ${gi > 0 ? 'style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:16px;"' : ''}>
    <div class="grupo-descripcion">${g.descripcion ? esc(g.descripcion) : '<span style="color:#94a3b8;font-style:italic;font-weight:400;">Sin descripción</span>'}</div>
    <div class="photo-section-pair">
      ${!esVentaPdf ? `
      <div class="photo-group">
        <div class="photo-group-title">ANTES</div>
        ${renderPhotoGrid(g.antes)}
      </div>` : ""}
      <div class="photo-group">
        <div class="photo-group-title">${esVentaPdf ? "ENTREGA" : "DESPUÉS"}</div>
        ${renderPhotoGrid(g.despues)}
      </div>
    </div>
  </div>
  `).join("")
      : `<div class="empty-box">Sin evidencia fotográfica registrada</div>`
  }

  <!-- CORRECTIVOS -->
  ${
    hayCorrectivos
      ? `
  <div class="section-title">Correctivos</div>
  <div class="correctivo-section">
    ${
      gruposCorrectivos.length > 0
        ? gruposCorrectivos.map((g, gi) => {
            const cols = g.fotos.length === 1 ? 1 : g.fotos.length === 2 ? 2 : 3;
            return `
      <div class="correctivo-grupo" ${gi > 0 ? 'style="border-top:1px solid #e0c060;padding-top:14px;margin-top:14px;"' : ''}>
        <div class="correctivo-grupo-desc">${g.descripcion ? esc(g.descripcion) : '<span style="color:#a07020;font-style:italic;font-weight:400;">Sin descripción</span>'}</div>
        <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;">
          ${g.fotos.map((f) => `
            <div class="correctivo-photo-card">
              <div class="correctivo-photo-wrap">
                <img src="${esc(f.src)}" alt="${esc(f.nombre || "")}" />
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
          }).join("")
        : ""
    }
  </div>
  `
      : ""
  }

  <!-- CIERRE -->
  <div class="section-title">${esInstalacionPdf ? "Cierre de instalación" : esVentaPdf ? "Cierre de entrega" : "Cierre"}</div>
  <div class="${esMantenimientoPdf ? "footer-box" : "footer-box-simple"}">
    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">Observaciones</h3>
      <div>${esc(n.observaciones || "—")}</div>
    </div>
    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">${esInstalacionPdf ? "Recomendaciones post-instalación" : esVentaPdf ? "Notas de entrega" : "Recomendaciones"}</h3>
      <div>${esc(n.recomendaciones || "—")}</div>
    </div>
    ${esMantenimientoPdf ? `
    <div class="box">
      <h3 style="margin:0 0 8px 0;font-size:12px;">Equipo operativo</h3>
      <div class="${equipoOperativo === "SI" ? "operativo-si" : "operativo-no"}">
        ${esc(equipoOperativo)}
      </div>
    </div>` : ""}
  </div>
</body>
</html>
`;
}

// ─── Puppeteer render ────────────────────────────────────────────────────────

async function renderNotificacionPdfBuffer(notificacion) {
  if (!notificacion) {
    throw new Error("Notificación no encontrada para PDF");
  }

  const ot = notificacion?.ordenTrabajo || {};
  const aviso = ot?.aviso || null;
  const tipoAviso = aviso?.tipoAviso || ot?.tipoAviso || "";
  const pdfFooterLabel = tipoAviso === "instalacion"
    ? "INFORME DE INSTALACIÓN — ALSUD"
    : tipoAviso === "venta"
    ? "INFORME DE ENTREGA — ALSUD"
    : "INFORME TÉCNICO — ALSUD";

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
          <span>${pdfFooterLabel}</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

// ─── Resumen OT (tabla tipo Excel para PDF combinado) ────────────────────────

const getEstadoEquipoLabel = (e) => {
  const s = String(e || "").toUpperCase();
  if (s === "OPERATIVO") return "OPERATIVO";
  if (s === "INOPERATIVO") return "INOPERATIVO";
  if (s === "OPERATIVO_CON_OBSERVACIONES") return "OP. CON OBS.";
  return "—";
};

const getEstadoEquipoBadge = (e) => {
  const s = String(e || "").toUpperCase();
  if (s === "OPERATIVO") return "ok";
  if (s === "INOPERATIVO") return "nok";
  return "na";
};

const COLUMNAS_DEFAULT = ["Cambio 1", "Cambio 2", "Cambio 3", "Cambio 4", "Cambio 5"];

function buildTablaGrupo(notificaciones, columnas, valores) {
  const cols = (columnas && columnas.length === 5) ? columnas : COLUMNAS_DEFAULT;
  // valores: { [notifId]: ["v0","v1","v2","v3","v4"] }
  const vals = valores || {};

  const filas = notificaciones.map((n) => {
    const equipo = n?.equipoOT?.equipo;
    const ubicacion = n?.equipoOT?.ubicacionTecnica;
    const nombreEquipo = equipo?.nombre || ubicacion?.nombre || "—";
    const codigoEquipo = equipo?.codigo || ubicacion?.codigo || "—";
    const estadoLabel = getEstadoEquipoLabel(n?.estadoGeneralEquipo);
    const estadoBadge = getEstadoEquipoBadge(n?.estadoGeneralEquipo);
    const celdas = vals[n.id] || ["", "", "", "", ""];

    return `
      <tr>
        <td>${esc(nombreEquipo)}</td>
        <td>${esc(codigoEquipo)}</td>
        <td>${esc(n?.numeroEquipo || "—")}</td>
        <td>${esc(fmtDate(n?.fechaInicio))}</td>
        ${celdas.map(v => `<td class="campo-libre">${esc(v || "")}</td>`).join("")}
        <td><span class="badge ${estadoBadge}">${esc(estadoLabel)}</span></td>
      </tr>
    `;
  }).join("");

  return `
    <table class="resumen-table">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Código</th>
          <th>N° Equipo</th>
          <th>Fecha Mantto</th>
          ${cols.map(c => `<th>${esc(c || "—")}</th>`).join("")}
          <th>Estado del equipo</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

function buildResumenOTHtml(notificaciones, otNumero, grupos) {
  // Si hay grupos custom, renderizar una tabla por grupo
  let tablasSections = "";

  if (Array.isArray(grupos) && grupos.length > 0) {
    tablasSections = grupos.map((grupo, gi) => {
      const ids = new Set(grupo.notificacionIds || []);
      const notifGrupo = ids.size > 0
        ? notificaciones.filter(n => ids.has(n.id))
        : notificaciones;

      if (notifGrupo.length === 0) return "";

      return `
        <div class="grupo-section" ${gi > 0 ? 'style="margin-top:28px;page-break-inside:avoid;"' : ''}>
          <div class="section-title">Tabla ${gi + 1}${grupo.nombre ? ` — ${esc(grupo.nombre)}` : ""}</div>
          ${buildTablaGrupo(notifGrupo, grupo.columnas, grupo.valores)}
        </div>
      `;
    }).join("");
  } else {
    // Sin grupos: una sola tabla con todos los equipos y columnas default
    tablasSections = buildTablaGrupo(notificaciones, COLUMNAS_DEFAULT);
  }

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 14mm 12mm; size: A4 landscape; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #111;
      margin: 0;
      padding: 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }

    .header-logo {
      height: 70px;
      width: auto;
      object-fit: contain;
    }

    .header-logo-text {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #1a3060;
    }

    .header-right { text-align: right; }

    .title {
      font-size: 16px;
      font-weight: 700;
    }

    .meta {
      font-size: 10px;
      line-height: 1.6;
      margin-top: 4px;
    }

    .section-title {
      margin: 16px 0 8px 0;
      font-size: 13px;
      font-weight: 700;
      border-bottom: 2px solid #111;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .resumen-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .resumen-table th,
    .resumen-table td {
      border: 1px solid #444;
      padding: 7px 6px;
      vertical-align: middle;
      text-align: center;
    }

    .resumen-table td:nth-child(1),
    .resumen-table td:nth-child(2) {
      text-align: left;
    }

    .resumen-table th {
      background: #1a3060;
      color: #fff;
      font-weight: 700;
      font-size: 10px;
    }

    .resumen-table tr:nth-child(even) td {
      background: #f5f7fb;
    }

    .campo-libre {
      min-width: 80px;
      background: #fffbe6 !important;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 700;
      border: 1px solid #555;
    }
    .badge.ok  { background: #dff5df; color: #0e5d0e; border-color: #70b570; }
    .badge.nok { background: #fde2e2; color: #a11d1d; border-color: #e06b6b; }
    .badge.na  { background: #fff4cc; color: #7a5a00; border-color: #e0bf57; }

    .leyenda {
      margin-top: 12px;
      font-size: 9px;
      color: #666;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .leyenda-color {
      display: inline-block;
      width: 14px;
      height: 14px;
      background: #fffbe6;
      border: 1px solid #ccc;
      vertical-align: middle;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${LOGO_BASE64 ? `<img src="${LOGO_BASE64}" class="header-logo" alt="ALSUD" />` : `<div class="header-logo-text">ALSUD</div>`}
    <div class="header-right">
      <div class="title">RESUMEN DE MANTENIMIENTO</div>
      <div class="meta">
        <div><b>OT:</b> ${esc(otNumero || "—")}</div>
        <div><b>Generado:</b> ${esc(new Date().toLocaleString("es-PE"))}</div>
        <div><b>Total equipos:</b> ${notificaciones.length}</div>
      </div>
    </div>
  </div>

  ${tablasSections}

  <div class="leyenda">
    <span class="leyenda-color"></span>
    Celdas amarillas: campos libres para registrar repuestos o cambios realizados
  </div>
</body>
</html>
`;
}

async function renderResumenOTPdfBuffer(notificaciones, otNumero, grupos) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setBypassCSP(true);

    const html = buildResumenOTHtml(notificaciones, otNumero, grupos);
    await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="font-size:9px;width:100%;padding:0 12mm;color:#444;display:flex;justify-content:space-between;">
          <span>RESUMEN DE MANTENIMIENTO — ALSUD</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

// ─── Merge PDFs ──────────────────────────────────────────────────────────────

/**
 * Merges multiple PDF buffers into a single PDF buffer.
 * @param {Buffer[]} pdfBuffers
 * @returns {Promise<Buffer>}
 */
async function mergePdfBuffers(pdfBuffers) {
  if (!pdfBuffers || pdfBuffers.length === 0) {
    throw new Error("No hay PDFs para combinar");
  }

  if (pdfBuffers.length === 1) return pdfBuffers[0];

  const merged = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const mergedBytes = await merged.save();
  return Buffer.from(mergedBytes);
}

module.exports = {
  renderNotificacionPdfBuffer,
  mergePdfBuffers,
  renderResumenOTPdfBuffer,
};
