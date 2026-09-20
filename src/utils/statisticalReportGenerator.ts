import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Account, Category, Transaction, UserSettings } from '../types';
import { formatCurrency, formatDate } from './storage';

export interface StatisticalReportData {
  filteredTransactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  filters: {
    startDate: string;
    endDate: string;
    rangePresetLabel: string;
    categoryIds: string[];
    tags: string[];
    searchConcept: string;
    type: string;
    accountId: string;
  };
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    savingsRate: number;
    avgDailyExpense: number;
    daysCount: number;
    avgTicketExpense: number;
    highestExpenseTx?: Transaction;
    txCount: number;
    incomeTxCount: number;
    expenseTxCount: number;
  };
  categoryBreakdown: {
    id: string;
    name: string;
    color: string;
    amount: number;
    percentage: number;
    count: number;
    avg: number;
  }[];
  tagBreakdown: {
    tag: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
  topConcepts: {
    description: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  insights: {
    type: 'positive' | 'warning' | 'info' | 'tip';
    title: string;
    description: string;
  }[];
}

/**
 * Generates an executive PDF report with statistics, charts tables, filters, and insights
 */
export function generateStatisticalPDFReport(data: StatisticalReportData): void {
  const {
    filters,
    metrics,
    categoryBreakdown,
    tagBreakdown,
    topConcepts,
    insights,
    settings,
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Brand Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FinanFlow Analytics', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('IN SIGHTS SOLUTIONS SAS', 85, 15);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Informe Estadístico Interactivo • Rango: ${filters.rangePresetLabel} (${formatDate(filters.startDate)} - ${formatDate(filters.endDate)})`, 14, 23);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')} • Moneda: ${settings.currency} • Transacciones analizadas: ${metrics.txCount}`, 14, 29);

  // Applied filters summary chip line
  const activeFilters = [];
  if (filters.type !== 'all') activeFilters.push(`Tipo: ${filters.type}`);
  if (filters.categoryIds.length > 0) activeFilters.push(`Categorías: ${filters.categoryIds.length} selec.`);
  if (filters.tags.length > 0) activeFilters.push(`Etiquetas: ${filters.tags.map(t => '#' + t).join(', ')}`);
  if (filters.searchConcept) activeFilters.push(`Concepto: "${filters.searchConcept}"`);
  if (filters.accountId) activeFilters.push(`Cuenta específica`);

  const filtersStr = activeFilters.length > 0 ? `Filtros activos: ${activeFilters.join(' | ')}` : 'Filtros: Todos los movimientos del rango';
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(doc.splitTextToSize(filtersStr, 182), 14, 35);

  let y = 47;

  // 2. Executive KPI Cards
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Métricas e Indicadores Clave (KPIs)', 14, y);

  y += 5;
  const cardW = 43;
  const cardH = 20;

  // KPI 1: Ingresos
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('INGRESOS TOTALES', 17, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.totalIncome, settings), 17, y + 14);

  // KPI 2: Gastos
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(60, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text('GASTOS TOTALES', 63, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.totalExpense, settings), 63, y + 14);

  // KPI 3: Balance Neto
  const isNetPositive = metrics.netBalance >= 0;
  doc.setFillColor(isNetPositive ? 239 : 255, isNetPositive ? 246 : 241, isNetPositive ? 255 : 242);
  doc.setDrawColor(isNetPositive ? 191 : 254, isNetPositive ? 219 : 202, isNetPositive ? 254 : 202);
  doc.roundedRect(106, y, cardW, cardH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(isNetPositive ? 30 : 153, isNetPositive ? 64 : 27, isNetPositive ? 175 : 27);
  doc.text(`BALANCE NETO (${metrics.savingsRate}%)`, 109, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.netBalance, settings), 109, y + 14);

  // KPI 4: Gasto Diario Promedio
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(152, y, cardW + 1, cardH, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PROMEDIO DIARIO', 155, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(metrics.avgDailyExpense, settings), 155, y + 14);

  y += cardH + 7;

  // Secondary metrics line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const highestTxt = metrics.highestExpenseTx
    ? `Mayor gasto: ${metrics.highestExpenseTx.description} (${formatCurrency(metrics.highestExpenseTx.amount, settings)})`
    : 'Sin gastos registrados';
  doc.text(`Ticket promedio de compra: ${formatCurrency(metrics.avgTicketExpense, settings)} • ${highestTxt} • Días evaluados: ${metrics.daysCount}`, 14, y);

  y += 7;

  // 3. Category Breakdown Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Desglose Estadístico por Categorías', 14, y);
  y += 3;

  const categoryTableData = categoryBreakdown.map((c) => [
    c.name,
    formatCurrency(c.amount, settings),
    `${c.percentage.toFixed(1)}%`,
    `${c.count} movs`,
    formatCurrency(c.avg, settings),
  ]);

  if (categoryTableData.length === 0) {
    categoryTableData.push(['Sin registros en el periodo filtrado', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Monto Total', '% Gasto', 'Frecuencia', 'Promedio / Mov']],
    body: categoryTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error autoTable adds lastAutoTable to doc
  y = doc.lastAutoTable.finalY + 8;

  // Check page overflow
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  // 4. Tag and Top Concepts side-by-side or stacked
  if (tagBreakdown.length > 0 || topConcepts.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. Distribución por Etiquetas (#tags) y Conceptos Clave', 14, y);
    y += 3;

    const tagTableData = tagBreakdown.slice(0, 8).map((t) => [
      `#${t.tag}`,
      formatCurrency(t.amount, settings),
      `${t.percentage.toFixed(1)}%`,
      `${t.count} movs`,
    ]);

    if (tagTableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Etiqueta (#tag)', 'Gasto Acumulado', '% Impacto', 'Frecuencia']],
        body: tagTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229], // indigo-600
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
        },
        margin: { left: 14, right: 14 },
      });

      // @ts-expect-error autoTable adds lastAutoTable to doc
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // Check page overflow for Insights
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // 5. Automated Financial Insights & Suggestions
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. Diagnóstico, Sugerencias y Análisis Financiero', 14, y);
  y += 4;

  insights.slice(0, 4).forEach((insight) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    const boxColor =
      insight.type === 'positive'
        ? [240, 253, 244]
        : insight.type === 'warning'
        ? [254, 242, 242]
        : [238, 242, 255];
    const borderColor =
      insight.type === 'positive'
        ? [187, 247, 208]
        : insight.type === 'warning'
        ? [254, 202, 202]
        : [199, 210, 254];
    const titleColor =
      insight.type === 'positive'
        ? [22, 101, 52]
        : insight.type === 'warning'
        ? [153, 27, 27]
        : [67, 56, 202];

    doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(14, y, 182, 16, 1.5, 1.5, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(insight.title, 18, y + 5.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(insight.description, 172);
    doc.text(splitDesc, 18, y + 10.5);

    y += 19;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FinanFlow Analytics • In Sights Solutions SAS (NIT 901844973-1) • Página ${i} de ${totalPages}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Documento confidencial para toma de decisiones financieras`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  // Download
  const cleanDateStr = new Date().toISOString().split('T')[0];
  doc.save(`FinanFlow_Informe_Estadistico_${cleanDateStr}.pdf`);
}

/**
 * Creates formatted markdown/text summary for quick sharing (WhatsApp, Telegram, email, clipboard)
 */
export function generateShareableSummaryText(data: StatisticalReportData): string {
  const { filters, metrics, categoryBreakdown, tagBreakdown, insights, settings } = data;

  const topCatsText = categoryBreakdown
    .slice(0, 3)
    .map((c, i) => `  ${i + 1}. ${c.name}: ${formatCurrency(c.amount, settings)} (${c.percentage.toFixed(1)}%)`)
    .join('\n');

  const topTagsText = tagBreakdown.length > 0
    ? '\n🏷️ *Top Etiquetas:*\n' + tagBreakdown.slice(0, 4).map((t) => `  • #${t.tag}: ${formatCurrency(t.amount, settings)}`).join('\n')
    : '';

  const mainAdvice = insights.length > 0 ? `\n💡 *Sugerencia Clave:* ${insights[0].title} - ${insights[0].description}\n` : '';

  return `📊 *INFORME ESTADÍSTICO FINANFLOW*
📅 *Periodo:* ${filters.rangePresetLabel} (${formatDate(filters.startDate)} - ${formatDate(filters.endDate)})
🏢 *Emisor:* In Sights Solutions SAS

💰 *Métricas Principales:*
• *Ingresos:* ${formatCurrency(metrics.totalIncome, settings)} (${metrics.incomeTxCount} movs)
• *Gastos:* ${formatCurrency(metrics.totalExpense, settings)} (${metrics.expenseTxCount} movs)
• *Balance Neto:* ${formatCurrency(metrics.netBalance, settings)}
• *Tasa de Ahorro:* ${metrics.savingsRate}%
• *Gasto Diario Promedio:* ${formatCurrency(metrics.avgDailyExpense, settings)}/día
• *Ticket Promedio:* ${formatCurrency(metrics.avgTicketExpense, settings)}

📂 *Top Categorías con Mayor Gasto:*
${topCatsText || '  (Sin gastos en el rango)'}
${topTagsText}
${mainAdvice}
✨ *Total Transacciones Analizadas:* ${metrics.txCount}
🔗 Generado con *FinanFlow Analytics* (insights.com.co)`;
}

/**
 * Exports filtered transactions to CSV
 */
export function exportFilteredTransactionsCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): void {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = [
    'Fecha',
    'Tipo',
    'Concepto / Descripcion',
    'Categoria',
    'Cuenta / Metodo',
    'Monto',
    'Etiquetas',
    'Notas',
    'Recurrente',
    'Comprobante'
  ];

  const rows = transactions.map((t) => [
    t.date,
    t.type === 'expense' ? 'Gasto' : t.type === 'income' ? 'Ingreso' : 'Transferencia',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(categoryMap.get(t.categoryId) || 'Sin categoría').replace(/"/g, '""')}"`,
    `"${(accountMap.get(t.accountId) || 'General').replace(/"/g, '""')}"`,
    t.amount.toString(),
    `"${(t.tags || []).join(', ').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    t.isRecurring ? 'Si' : 'No',
    t.receiptImage ? 'Si' : 'No',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `FinanFlow_Movimientos_Filtrados_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
