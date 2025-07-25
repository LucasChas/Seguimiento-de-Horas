import nodemailer from 'nodemailer';

// 🔧 Función para convertir decimal de horas a formato "Xh Ym"
function formatearHoras(decimal) {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);

  let resultado = '';
  if (horas > 0) resultado += `${horas}h `;
  if (minutos > 0) resultado += `${minutos}m`;
  return resultado.trim() || '0h';
}

export default async function sendEmail({ email, nombre, apellido, totalHoras, restantes, fecha }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fechaFormateada = new Date(fecha).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 24px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #ddd;">
        <h2 style="text-align: center; color: #1976d2; margin-bottom: 20px;">📊 Resumen Diario - TimeTrack Solutions</h2>
        <p style="font-size: 16px;">Hola <strong>${nombre} ${apellido}</strong>,</p>
        <p style="font-size: 15px; color: #444;">Este es tu resumen de horas para <strong>${fechaFormateada}</strong>:</p>
        <ul style="font-size: 15px; color: #444;">
          <li><strong>Total trabajado:</strong> ${formatearHoras(totalHoras)}</li>
          <li><strong>Restantes para completar las 8h:</strong> ${formatearHoras(restantes)}</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://seguimientodehoras.vercel.app" style="background-color: #1976d2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ir a la plataforma</a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;" />
        <p style="font-size: 13px; color: #888; text-align: center;">Este es un mensaje automático de TimeTrack Solutions. No respondas a este correo.</p>
      </div>
    `;

    const mailOptions = {
      from: `"TimeTrack Solutions" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '📊 Recordatorio de Horas Cargadas',
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${email}`);
  } catch (error) {
    console.error(`❌ Error al enviar email a ${email}:`, error);
  }
}
