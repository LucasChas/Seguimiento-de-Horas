import 'dotenv/config';
import cron from 'node-cron';
import runNotificaciones from './src/notify-server/index.js';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 📍 Ruta relativa hacia index.js
const relativePath = path.join(__dirname, 'src', 'notify-server', 'index.js');

// ✅ Asegurar compatibilidad con Windows (quita / inicial si es necesario)
const indexPath = platform() === 'win32' && relativePath.startsWith('/')
  ? relativePath.slice(1)
  : relativePath;

// ⏰ Ejecutar cron cada minuto (podés ajustar esto según tus pruebas)
cron.schedule('* * * * *', () => {
  console.log('⏰ Ejecutando index.js...');
  runNotificaciones(); // ✅ ejecuta directamente con variables de entorno cargadas
});