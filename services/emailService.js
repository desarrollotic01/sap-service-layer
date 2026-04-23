const nodemailer = require("nodemailer");
const fs   = require("fs");
const path = require("path");

const logoBase64 = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, "..", "assets", "logo-Alsud.png")).toString("base64");
  } catch { return null; }
})();

const logoTag = logoBase64
  ? `<img src="data:image/png;base64,${logoBase64}" alt="Alsud" style="height:48px;display:block;">`
  : `<span style="color:#fff;font-size:22px;font-weight:700;">ALSUD</span>`;

/**
 * Crea el transporter leyendo .env en el momento del envío (no al importar el módulo).
 * Esto garantiza que siempre usa las variables actuales.
 */
const buildTransporter = () => {
  const port   = Number(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure,
    requireTLS: !secure, // fuerza STARTTLS en conexiones de puerto 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // evita errores de certificados en servidores corporativos
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

/**
 * Función genérica de envío de correo.
 */
async function enviarCorreo({ to, cc, subject, html, text }) {
  try {
    let ccNormalizado;
    if (Array.isArray(cc) && cc.length > 0) {
      ccNormalizado = cc.filter(Boolean).join(", ");
    } else if (typeof cc === "string" && cc.trim()) {
      ccNormalizado = cc.trim();
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Sistema de Mantenimiento" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    if (text) mailOptions.text = text;
    if (ccNormalizado) mailOptions.cc = ccNormalizado;

    const transporter = buildTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Correo enviado a ${to}${ccNormalizado ? ` (CC: ${ccNormalizado})` : ""} — MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error enviando correo:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envía el correo de solicitud de almacén al destinatario.
 */
async function enviarCorreoSolicitudAlmacen({
  destinatarioCorreo,
  destinatarioNombre,
  numeroSolicitud,
  otNumero,
  lineas = [],
  solicitante = "",
  requiredDate = "",
}) {
  const fmt = (v, fb = "—") =>
    v !== null && v !== undefined && String(v).trim() !== "" ? String(v).trim() : fb;

  const fmtFecha = (v) => {
    if (!v) return "—";
    try { return new Date(v).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return String(v); }
  };

  const filasTabla = lineas
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

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:820px;margin:0 auto;padding:24px 16px;">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#0f2547 0%,#1e3a5f 60%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>${logoTag}</div>
      <div style="text-align:right;">
        <p style="margin:0;color:#93c5fd;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Solicitud de Almacén</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;">${fmt(numeroSolicitud)}</p>
      </div>
    </div>

    <!-- META -->
    <div style="background:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:20px 32px;display:flex;gap:32px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">
      <div>
        <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Destinatario</span>
        <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${fmt(destinatarioNombre || destinatarioCorreo)}</p>
      </div>
      <div>
        <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Solicitante</span>
        <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${fmt(solicitante)}</p>
      </div>
      <div>
        <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Orden de Trabajo</span>
        <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${fmt(otNumero)}</p>
      </div>
      <div>
        <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Fecha requerida</span>
        <p style="margin:3px 0 0;font-size:14px;color:#1e293b;font-weight:600;">${fmtFecha(requiredDate)}</p>
      </div>
    </div>

    <!-- CUERPO -->
    <div style="background:#ffffff;padding:24px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
        Se solicita la entrega de los siguientes materiales para la Orden de Trabajo <strong style="color:#1e293b;">${fmt(otNumero)}</strong>.
        Por favor atender según la fecha requerida.
      </p>

      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
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
            ${filasTabla || `<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sin ítems</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="margin-top:20px;padding:16px 20px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">
          <strong style="color:#1e293b;">Solicitud:</strong> ${fmt(numeroSolicitud)} &nbsp;·&nbsp;
          <strong style="color:#1e293b;">OT:</strong> ${fmt(otNumero)} &nbsp;·&nbsp;
          <strong style="color:#1e293b;">Total ítems:</strong> ${lineas.length}
        </p>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:18px 32px;display:flex;align-items:center;justify-content:space-between;">
      <p style="margin:0;color:#64748b;font-size:12px;">Generado automáticamente — Sistema de Gestión de Mantenimiento</p>
      <p style="margin:0;color:#475569;font-size:12px;">${new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>

  </div>
</body>
</html>`;

  const text =
    `Estimado/a ${destinatarioNombre || destinatarioCorreo},\n\n` +
    `Solicitud de almacén ${numeroSolicitud} para OT ${otNumero}.\n` +
    `Solicitante: ${fmt(solicitante)}\n\n` +
    lineas.map((l, i) => `${i + 1}. [${l.itemCode}] ${l.description} — Cant: ${l.quantity}`).join("\n") +
    `\n\nSaludos.`;

  const transporter = buildTransporter();
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Sistema de Mantenimiento" <${process.env.EMAIL_USER}>`,
      to: destinatarioCorreo,
      subject: `Solicitud de Almacén ${numeroSolicitud} — OT ${otNumero}`,
      text,
      html,
    });
    console.log(`✅ Correo enviado a ${destinatarioCorreo} — MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error enviando correo:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { enviarCorreoSolicitudAlmacen, enviarCorreo };
