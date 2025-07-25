import nodemailer from 'nodemailer';

export default async function sendEmail({ email, nombre, totalHoras, restantes, fecha }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const fechaFormateada = new Date(fecha).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const horasTexto = totalHoras === 1 ? '1 hora' : `${totalHoras} horas`;
    const restantesTexto = restantes === 1 ? '1 hora' : `${restantes} horas`;

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 16px;">
        <p>Hola <b>${nombre}</b>,</p>
        <p>Este es tu resumen de horas trabajadas para el día <b>${fechaFormateada}</b>:</p>
        <ul>
          <li><b>Total trabajado:</b> ${horasTexto}</li>
          <li><b>Restantes para completar las 8h:</b> ${restantesTexto}</li>
        </ul>
        <p>Este email fue enviado automáticamente por <b>TimeTrack Solutions</b>.</p>
      </div>
    `;

    const mailOptions = {
      from: `"TimeTrack Solutions" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '📊 Recordatorio de Horas Cargadas',
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${email}`);
  } catch (error) {
    console.error(`❌ Error al enviar email a ${email}:`, error);
  }
}
