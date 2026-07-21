import React from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function exportCSV(data, columns, filename) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportPDF(data, columns, filename, title) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title || filename, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

  doc.autoTable({
    startY: 28,
    head: [columns.map(c => c.label)],
    body: data.map(row =>
      columns.map(c => {
        const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
        return String(val ?? '');
      })
    ),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] }
  });

  doc.save(`${filename}.pdf`);
}

const ExportButtons = ({ data, columns, filename, title }) => {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => exportCSV(data, columns, filename)}
        title="Export as CSV"
      >
        <FiDownload /> CSV
      </button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => exportPDF(data, columns, filename, title)}
        title="Export as PDF"
      >
        <FiFileText /> PDF
      </button>
    </div>
  );
};

export { exportCSV, exportPDF };
export default ExportButtons;
