const nodemailer = require("nodemailer");
 
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.office365.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    ciphers: "SSLv3",
  },
});
 
/**
 * Envía el correo de solicitud de almacén al destinatario.
 * @param {object} params
 * @param {string} params.destinatarioCorreo
 * @param {string} params.destinatarioNombre
 * @param {string} params.numeroSolicitud
 * @param {string} params.otNumero
 * @param {Array}  params.lineas
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function enviarCorreoSolicitudAlmacen({
  destinatarioCorreo,
  destinatarioNombre,
  numeroSolicitud,
  otNumero,
  lineas = [],
}) {
  // Construir tabla HTML con los ítems
  const filasTabla = lineas
    .map(
      (l, i) => `
      <tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#ffffff"}">
        <td style="padding:8px 12px;border:1px solid #e0e0e0;">${i + 1}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;font-weight:600;">${l.itemCode || "—"}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;">${l.description || "—"}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;">${l.quantity ?? "—"}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center;">${l.warehouseCode || "—"}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;">${l.costingCode || "—"}</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;">${l.projectCode || "—"}</td>
      </tr>`
    )
    .join("");
 
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
  <div style="max-width:800px;margin:0 auto;padding:24px;">
 
    <div style="background:#1e293b;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="color:#fff;margin:0;font-size:18px;">Solicitud de Almacén</h2>
      <p style="color:#94a3b8;margin:4px 0 0;font-size:14px;">Número: <strong style="color:#fff;">${numeroSolicitud}</strong></p>
    </div>
 
    <div style="background:#fff;border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p style="margin:0 0 16px;">Estimado/a <strong>${destinatarioNombre || destinatarioCorreo}</strong>,</p>
      <p style="margin:0 0 20px;color:#555;">
        Se solicita la entrega de los siguientes materiales correspondientes a la
        Orden de Trabajo <strong>${otNumero}</strong>:
      </p>
 
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#1e293b;color:#fff;">
            <th style="padding:10px 12px;border:1px solid #334155;text-align:left;">#</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:left;">Código</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:left;">Descripción</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:center;">Cant.</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:center;">Almacén</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:left;">C. Costo</th>
            <th style="padding:10px 12px;border:1px solid #334155;text-align:left;">Proyecto</th>
          </tr>
        </thead>
        <tbody>
          ${filasTabla}
        </tbody>
      </table>
 
      <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:13px;color:#64748b;">
          <strong>Solicitud:</strong> ${numeroSolicitud}<br>
          <strong>OT:</strong> ${otNumero}<br>
          <strong>Total de ítems:</strong> ${lineas.length}
        </p>
      </div>
 
      <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
        Este correo fue generado automáticamente por el sistema de gestión de mantenimiento.
      </p>
    </div>
  </div>
</body>
</html>`;
 
  // Texto plano (fallback)
  const itemsTexto = lineas
    .map(
      (l, i) =>
        `${i + 1}. [${l.itemCode}] ${l.description} - Cant: ${l.quantity}`
    )
    .join("\n");
 
  const text =
    `Estimado/a ${destinatarioNombre || destinatarioCorreo},\n\n` +
    `Se solicita la entrega de los siguientes materiales para la OT ${otNumero}:\n\n` +
    `${itemsTexto}\n\n` +
    `Número de solicitud: ${numeroSolicitud}\n\nSaludos.`;
 
  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Mantenimiento" <${process.env.MAIL_USER}>`,
      to: destinatarioCorreo,
      subject: `Solicitud de Almacén ${numeroSolicitud} - OT ${otNumero}`,
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
 
module.exports = { enviarCorreoSolicitudAlmacen };
 