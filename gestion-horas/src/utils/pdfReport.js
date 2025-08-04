// utils/pdfReport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function normalizeSelectedDate(input) {
  if (input instanceof Date && !isNaN(input)) return input;
  if (typeof input === 'number' && isFinite(input)) return new Date(input);
  if (typeof input === 'string' && input.trim()) {
    const d = new Date(input);
    if (!isNaN(d)) return d;
    const m = input.match(/^(\d{4})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatMonthEs(date) {
  try {
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

function formatHsLabel(h) {
  const totalMin = Math.round(Number(h || 0) * 60);
  const hs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min > 0 ? `${hs} hs. ${min} min.` : `${hs} hs.`;
}

async function loadImageAsDataURL(src) {
  if (!src) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function generateMonthSummaryPDF({
  details,
  selectedDate,
  userName,      // <- nombre real
  userEmail,     // <- email real
  logoSrc = null,
  expectedHours = null,
  loadedHours = null
}) {
  const monthDate = normalizeSelectedDate(selectedDate);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  const monthTitle = `Resumen mensual — ${formatMonthEs(monthDate)}`;
  const generatedAt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

  const dataURL = await loadImageAsDataURL(logoSrc);
  if (dataURL) doc.addImage(dataURL, 'PNG', marginX, 40, 90, 90, undefined, 'FAST');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(monthTitle, pageWidth - marginX, 70, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const userLines = [
    userName ? `Generado por: ${userName}` : null,
    userEmail ? `Email: ${userEmail}` : null,
    `Fecha de generación: ${generatedAt}`
  ].filter(Boolean);
  userLines.forEach((line, i) => doc.text(line, pageWidth - marginX, 90 + i * 14, { align: 'right' }));

  let cursorY = 140;
  const externosCount = details?.externos?.length || 0;
  const restantesCount = details?.restantes?.length || 0;
  const trabajadosCount = details?.trabajados?.length || 0;

  const resumen = [
    `Días trabajados: ${trabajadosCount}`,
    `Días con causas externas: ${externosCount}`,
    `Días pendientes (sin registro): ${restantesCount}`,
    expectedHours != null && `Horas esperadas del mes: ${formatHsLabel(expectedHours)}`,
    loadedHours != null && `Horas cargadas del mes: ${formatHsLabel(loadedHours)}`
  ].filter(Boolean);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Resumen:', marginX, cursorY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  cursorY += 8;
  resumen.forEach((line) => { cursorY += 14; doc.text(`• ${line}`, marginX, cursorY); });
  cursorY += 18;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Días trabajados', marginX, cursorY);
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [27, 94, 32] },
    head: [['Fecha', 'Horas', 'Causa']],
    body: (details?.trabajados || []).map(r => [r.fecha, r.horas, r.causa || '-']),
    didDrawPage: () => {
      const str = `Página ${doc.internal.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    }
  });

  let nextY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 24 : cursorY + 40;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Días pendientes (sin registro)', marginX, nextY);

  autoTable(doc, {
    startY: nextY + 8,
    margin: { left: marginX, right: marginX },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [25, 118, 210] },
    head: [['Fecha', 'Estado']],
    body: (details?.restantes || []).map(r => [r.fecha, 'Sin registro']),
    didDrawPage: () => {
      const str = `Página ${doc.internal.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
    }
  });

  nextY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 24 : undefined;
  if (typeof nextY === 'number') {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`Causas externas — Total: ${externosCount}`, marginX, nextY);
  }

  const yyyy = monthDate.getFullYear();
  const mm = String(monthDate.getMonth() + 1).padStart(2, '0');
  doc.save(`ResumenMes-${yyyy}-${mm}.pdf`);
}
