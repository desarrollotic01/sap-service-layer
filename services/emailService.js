const nodemailer = require("nodemailer");

// 🔥 Transporter Outlook
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp.office365.com
  port: process.env.EMAIL_PORT || 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔥 Verificar conexión (opcional pero PRO)
const verificarConexion = async () => {
  try {
    await transporter.verify();
    console.log("📧 SMTP listo para enviar correos");
  } catch (error) {
    console.error("❌ Error SMTP:", error.message);
  }
};

// 🔥 FUNCIÓN PRINCIPAL
const enviarCorreo = async ({ to, subject, html }) => {
  if (!to) throw new Error("Correo destino requerido");

  const mailOptions = {
    from: `"Sistema OT" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log("📨 Correo enviado:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error enviando correo:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  enviarCorreo,
  verificarConexion,
};