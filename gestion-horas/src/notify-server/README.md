# Notify Server - TimeTrack Solutions

Este pequeño backend consulta Supabase y envía recordatorios por correo usando Resend.

## Cómo usar

1. Crear `.env` basado en el ejemplo.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar manualmente:
   ```bash
   node index.js
   ```

## Variables de entorno requeridas

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE
- EMAIL_API_KEY (de Resend)
- RESEND_SENDER_ID (ej: re_xxx...)

## Formato del correo

Incluye:
- Nombre del usuario
- Fecha en texto (ej: Lunes 22 de julio)
- Horas registradas y faltantes
