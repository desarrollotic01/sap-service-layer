const fs   = require("fs");
const path = require("path");

const logoBase64 = (() => {
  try {
    const file = path.join(__dirname, "..", "assets", "logo-Alsud.png");
    return fs.readFileSync(file).toString("base64");
  } catch {
    return null;
  }
})();

const logoTag = logoBase64
  ? `<img src="data:image/png;base64,${logoBase64}" alt="Alsud" style="height:48px;display:block;">`
  : `<span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">ALSUD</span>`;

const fmt = (val, fallback = "—") =>
  val !== null && val !== undefined && String(val).trim() !== "" ? String(val).trim() : fallback;

const fmtFecha = (val) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(val);
  }
};

const buildHtmlBloque = (solicitudes = [], otNumero = "") => {
  const total = solicitudes.reduce(
    (acc, s) => acc + (s.lineas || []).reduce((a, l) => a + (Number(l.quantity) || 0), 0),
    0
  );

  const seccionesSolicitudes = solicitudes
    .map((sol, si) => {
      const lineas = sol.lineas || sol.dataValues?.lineas || [];
      const requester = fmt(sol.requester || sol.dataValues?.requester);
      const numeroSolicitud = fmt(sol.numeroSolicitud || sol.dataValues?.numeroSolicitud, `SOL-${si + 1}`);
      const requiredDate = fmtFecha(sol.requiredDate || sol.dataValues?.requiredDate);
      const comments = fmt(sol.comments || sol.dataValues?.comments, null);

      const filasLineas = lineas
        .map(
          (l, i) => `
          <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:13px;text-align:center;">${i + 1}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#1e40af;font-weight:600;">${fmt(l.itemCode)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${fmt(l.description)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;font-weight:600;color:#0f172a;">${fmt(l.quantity)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;color:#475569;">${fmt(l.warehouseCode)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${fmt(l.costingCode)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${fmt(l.projectCode)}</td>
          </tr>`
        )
        .join("");

      return `
        <div style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.07);">
          <!-- Cabecera solicitud -->
          <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <span style="color:#93c5fd;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Solicitud de Almacén</span>
              <h3 style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700;">${numeroSolicitud}</h3>
            </div>
            <span style="background:rgba(255,255,255,0.15);color:#e0f2fe;font-size:12px;padding:4px 12px;border-radius:20px;font-weight:600;">
              ${lineas.length} ítem${lineas.length !== 1 ? "s" : ""}
            </span>
          </div>

          <!-- Meta solicitud -->
          <div style="background:#f8fafc;padding:14px 20px;display:flex;gap:32px;flex-wrap:wrap;border-bottom:1px solid #e2e8f0;">
            <div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Solicitante</span>
              <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${requester}</p>
            </div>
            <div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha requerida</span>
              <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${requiredDate}</p>
            </div>
            ${otNumero ? `<div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Orden de Trabajo</span>
              <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${otNumero}</p>
            </div>` : ""}
            ${comments ? `<div>
              <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Observaciones</span>
              <p style="margin:3px 0 0;font-size:14px;color:#475569;">${comments}</p>
            </div>` : ""}
          </div>

          <!-- Tabla de ítems -->
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
              <thead>
                <tr style="background:#1e293b;">
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">#</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Código</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Descripción</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Cant.</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Almacén</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">C. Costo</th>
                  <th style="padding:11px 14px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Proyecto</th>
                </tr>
              </thead>
              <tbody>
                ${filasLineas || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sin ítems</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:820px;margin:0 auto;padding:24px 16px;">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#0f2547 0%,#1e3a5f 60%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        ${logoTag}
      </div>
      <div style="text-align:right;">
        <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Requerimiento de Almacén</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:13px;">
          ${solicitudes.length} solicitud${solicitudes.length !== 1 ? "es" : ""} · ${total} ítem${total !== 1 ? "s" : ""} en total
        </p>
      </div>
    </div>

    <!-- CUERPO -->
    <div style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Estimado equipo de almacén,</p>
      <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.6;">
        Se adjuntan las solicitudes de materiales para atender la${solicitudes.length !== 1 ? "s" : ""}
        orden${solicitudes.length !== 1 ? "es" : ""} indicada${solicitudes.length !== 1 ? "s" : ""}.
        Por favor gestionar la entrega según las fechas requeridas.
      </p>

      ${seccionesSolicitudes}
    </div>

    <!-- FOOTER -->
    <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:20px 32px;display:flex;align-items:center;justify-content:space-between;">
      <p style="margin:0;color:#64748b;font-size:12px;">
        Generado automáticamente — Sistema de Gestión de Mantenimiento
      </p>
      <p style="margin:0;color:#475569;font-size:12px;">
        ${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </div>

  </div>
</body>
</html>`;
};

module.exports = { buildHtmlBloque };
