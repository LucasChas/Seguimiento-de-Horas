import axios from 'axios';

export default async function sendEmail({ email, nombre, totalHoras, restantes, fecha }) {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const diaTexto = dias[fecha.getDay()];
  const fechaTexto = `${diaTexto} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;

  const body = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h2 style="text-align: center; color: #0d47a1;">📅 Recordatorio Diario - TimeTrack</h2>
    
    <p style="font-size: 16px; color: #333;">Hola <strong style="color: #0d47a1;">${nombre}</strong>,</p>

    <p style="font-size: 15px; color: #444;">
      Hoy es <strong style="color: #0d47a1;">${fechaTexto}</strong>.<br>
      Llevás registradas <strong>${totalHoras}</strong> hora(s).<br>
      Te faltan <strong style="color: #c62828;">${restantes}</strong> hora(s) para completar tu jornada.
    </p>

    <p style="font-size: 15px; color: #333;">
      Ingresá a <strong>TimeTrack Solutions</strong> para completar tu carga horaria del día.
    </p>

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
