import axios from 'axios';

function formatearHoras(decimal) {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  let texto = '';
  if (horas > 0) texto += `${horas}h`;
  if (minutos > 0) texto += ` ${minutos}m`;
  return texto.trim() || '0h';
}

export default async function sendEmail({ email, nombre, totalHoras, restantes, fecha }) {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const diaTexto = dias[fecha.getDay()];
  const fechaTexto = `${diaTexto} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;

  const body = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 24px; background-color: #f5f7fb; border-radius: 12px; border: 1px solid #e0e0e0;">
      <h2 style="text-align: center; color: #1976d2; margin-bottom: 12px;">⏰ TimeTrack - Recordatorio Diario</h2>
      
      <p style="font-size: 16px; color: #333;">Hola <strong style="color: #1976d2;">${nombre}</strong>,</p>

      <p style="font-size: 15px; color: #444; margin-top: 12px;">
        Hoy es <strong style="color: #1976d2;">${fechaTexto}</strong>.<br>
        Llevás registradas <strong style="color: #388e3c;">${formatearHoras(totalHoras)}</strong>.<br>
        Te faltan <strong style="color: #d32f2f;">${formatearHoras(restantes)}</strong> para completar tu jornada.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://seguimientodehoras.vercel.app" style="background-color: #1976d2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ir a TimeTrack</a>
      </div>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

      <p style="font-size: 13px; color: #888; text-align: center;">
        Este es un mensaje automático. No respondas a este correo.
      </p>
    </div>
  `;

  try {
    await axios.post('https://api.resend.com/emails', {
      from: 'TimeTrack <onboarding@resend.dev>',
      to: email,
      subject: 'Recordatorio diario - TimeTrack',
      html: body
    }, {
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Email enviado a ${email}`);
  } catch (err) {
    console.error(`❌ Error al enviar email a ${email}:`, err.response?.data || err.message);
  }
}
