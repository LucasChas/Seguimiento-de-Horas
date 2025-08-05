import React, { useEffect, useState } from 'react';
import './MonthSummary.css';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';

// IMPORT CORRECTO hacia utils
import { generateMonthSummaryPDF } from '../../utils/pdfReport';

const MySwal = withReactContent(Swal);
const COLORS = ['#94d3a2', '#ff9800', '#e0e0e0'];

const formatHoras = (hs) => {
  const totalMin = Math.round(Number(hs || 0) * 60);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  if (horas > 0 && minutos > 0) return `${horas} hs. ${minutos} min.`;
  if (horas > 0) return `${horas} hs.`;
  return `${minutos} min.`;
};

const exportToExcel = (rows, filename, sheetName = 'Hoja1') => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const cell = ws[`B${R + 1}`];
    if (cell) cell.s = { alignment: { wrapText: true } };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
const exportMultipleToExcel = (dataMap, filename) => {
  const wb = XLSX.utils.book_new();
  Object.entries(dataMap).forEach(([sheetName, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cell = ws[`B${R + 1}`];
      if (cell) cell.s = { alignment: { wrapText: true } };
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export default function MonthSummary({ workdays, monthDate, holidays = [], currentUser, appLogo }) {
  const [expectedHours, setExpectedHours] = useState(0);
  const [loadedHours, setLoadedHours] = useState(0);
  const [pieData, setPieData] = useState([]);
  const [details, setDetails] = useState({ trabajados: [], externos: [], restantes: [] });

  useEffect(() => {
    const baseDate = monthDate instanceof Date ? monthDate : new Date(monthDate || Date.now());
    const start = startOfMonth(baseDate);
    const end = endOfMonth(baseDate);
    const allDays = eachDayOfInterval({ start, end });

    const holidaySet = new Set(
    (holidays || [])
      .map(h => (typeof h === 'string' ? h : h?.date))
      .filter(Boolean)
      );
    const monthKey = format(baseDate, 'yyyy-MM');

    const laborables = allDays.filter(day => {
    const iso = format(day, 'yyyy-MM-dd');
    return !isWeekend(day) && !holidaySet.has(iso);
  });

    setExpectedHours(laborables.length * 8);

    const workedGrouped = {};
    const externalGrouped = {};
    const recordedDates = new Set();

    workdays.forEach(wd => {
      if (wd.date.startsWith(monthKey)) {
        recordedDates.add(wd.date);
        if (['trabajado', 'extra'].includes(wd.status)) {
          if (!workedGrouped[wd.date]) workedGrouped[wd.date] = { total: 0, descripciones: [] };
          workedGrouped[wd.date].total += wd.hours_worked || 0;
          if (wd.description) {
            const desc = wd.status === 'extra' ? `${wd.description} (extra)` : wd.description;
            workedGrouped[wd.date].descripciones.push(desc);
          }
        }
        if (wd.status === 'externo') {
          if (!externalGrouped[wd.date]) externalGrouped[wd.date] = [];
          externalGrouped[wd.date].push({
            descripcion: wd.description || 'Sin descripción',
            horas: wd.hours_worked === 0 ? 8 : wd.hours_worked
          });
        }
      }
    });

    const workedList = Object.entries(workedGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({
      fecha: format(new Date(date + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: es }),
      causa: data.descripciones.filter(Boolean).join('\n'),
      horas: formatHoras(data.total)
    }));

    const externalList = Object.entries(externalGrouped).sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, regs]) =>
      regs.map(reg => ({
        fecha: format(new Date(date + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: es }),
        causa: reg.descripcion,
        horas: formatHoras(reg.horas)
      }))
    );

    const remainingList = laborables
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => !recordedDates.has(d))
      .map(date => ({
        fecha: format(new Date(date + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: es }),
        causa: 'Sin registro',
        horas: '-'
      }));

    const totalWorked = Object.values(workedGrouped).reduce((sum, { total }) => sum + total, 0);

    setLoadedHours(totalWorked);
    setPieData([
      { name: 'Trabajados', value: workedList.length },
      { name: 'Externos', value: externalList.length },
      { name: 'Restantes', value: remainingList.length }
    ]);
    setDetails({ trabajados: workedList, externos: externalList, restantes: remainingList });
  }, [workdays, monthDate, holidays]);

  const showPaginatedModal = (title, rows) => {
    const pageSize = 5;
    let currentPage = 1;
    const totalPages = Math.ceil(rows.length / pageSize);

    const generateTableHTML = () => {
      const start = (currentPage - 1) * pageSize;
      const pageItems = rows.slice(start, start + pageSize);
      return `
        <div class="month-summary-modal">
          <button id="modalCloseX" class="close-icon">×</button>

          <h3>${title}</h3>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Causa</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map(r => `
                  <tr>
                    <td>${r.fecha}</td>
                    <td>
                      <ul class="causa-list">
                        ${String(r.causa || '')
                          .split('\n')
                          .filter(Boolean)
                          .map(desc => `<li>${desc}</li>`)
                          .join('')}
                      </ul>
                    </td>
                    <td>${r.horas}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="modal-controls">
            <button id="exportExcel" class="pagination-button">Exportar Excel</button>
            <div class="pagination">
              <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''} class="pagination-button">← Anterior</button>
              <span class="pagination-info">Página ${currentPage} de ${totalPages}</span>
              <button id="nextPage" ${currentPage === totalPages ? 'disabled' : ''} class="pagination-button">Siguiente →</button>
            </div>
          </div>
        </div>
      `;
    };

    MySwal.fire({
      html: generateTableHTML(),
      showConfirmButton: false,
      customClass: { popup: 'custom-swal-popup' },
      heightAuto: false,
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        const attach = () => {
          container.querySelector('#prevPage')?.addEventListener('click', () => {
            if (currentPage > 1) {
              currentPage--;
              container.innerHTML = generateTableHTML();
              attach();
            }
          });
          container.querySelector('#nextPage')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
              currentPage++;
              container.innerHTML = generateTableHTML();
              attach();
            }
          });
          container.querySelector('#exportExcel')?.addEventListener('click', () => {
            exportToExcel(rows, `Resumen-${title}`);
          });
          container.querySelector('#modalCloseX')?.addEventListener('click', () => {
            Swal.close();
          });
        };
        attach();
      }
    });
  };

  const handleSectorClick = (entry) => {
    const key = entry.name.toLowerCase();
    const data = details[key];
    if (data && data.length > 0) {
      showPaginatedModal(entry.name, data);
    }
  };

  const handleExportGeneral = () => {
    exportMultipleToExcel(details, 'Resumen-completo');
  };

  const handleExportPDF = async () => {
    try {
      await generateMonthSummaryPDF({
        details,
        selectedDate: monthDate,
        userName: currentUser?.name || '',
        userEmail: currentUser?.email || '',
        logoSrc: appLogo,
        expectedHours,
        loadedHours
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="month-summary">
      <h4>Resumen del Mes</h4>
      <p><strong>Horas esperadas:</strong> {formatHoras(expectedHours)}</p>
      <p><strong>Horas cargadas:</strong> {formatHoras(loadedHours)}</p>

      <div style={{ height: 240, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSectorClick(entry)}
                />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="export-actions">
        <button className="export-all-button" onClick={handleExportGeneral}>
          Exportar Todo a Excel
        </button>
        <button className="export-pdf-button" onClick={handleExportPDF}>
          Exportar Resumen a PDF
        </button>
      </div>
    </div>
  );
}
