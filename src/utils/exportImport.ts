import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Account, Category, FinancialHealthAnalysis, Transaction, UserSettings } from '../types';
import { formatCurrency, formatDate } from './storage';

// 1. PDF Monthly Financial Report Generator
export function generatePDFReport(options: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  periodName: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  aiAdvice?: FinancialHealthAnalysis | null;
}) {
  const {
    transactions,
    categories,
    accounts,
    settings,
    periodName,
    startDate,
    endDate,
    totalIncome,
    totalExpense,
    aiAdvice,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FinanFlow', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 114, 206); // Insights Blue
  doc.text('IN SIGHTS SOLUTIONS SAS', 50, 15);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Informe Financiero • Periodo: ${periodName} (${formatDate(startDate)} - ${formatDate(endDate)})`, 14, 23);
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} • insights.com.co`, 14, 29);

  // Executive Summary Cards
  let y = 46;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Resumen Ejecutivo', 14, y);

  y += 6;
  // Card 1: Ingresos
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(14, y, 56, 22, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('INGRESOS TOTALES', 18, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalIncome, settings), 18, y + 16);

  // Card 2: Gastos
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(74, y, 56, 22, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // red-800
  doc.text('GASTOS TOTALES', 78, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalExpense, settings), 78, y + 16);

  // Card 3: Ahorro Neto
  const isPositive = netSavings >= 0;
  doc.setFillColor(isPositive ? 239 : 255, isPositive ? 246 : 241, isPositive ? 255 : 242);
  doc.setDrawColor(isPositive ? 191 : 254, isPositive ? 219 : 202, isPositive ? 254 : 202);
  doc.roundedRect(134, y, 62, 22, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(isPositive ? 30 : 153, isPositive ? 64 : 27, isPositive ? 175 : 27);
  doc.text(`AHORRO NETO (${savingsRate}%)`, 138, y + 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(netSavings, settings), 138, y + 16);

  y += 28;

  // AI Diagnostic Section (if available)
  if (aiAdvice) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 24, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`Diagnóstico Inteligente IA - Salud Financiera: ${aiAdvice.healthScore}/100 (${aiAdvice.healthStatus})`, 18, y + 7);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(aiAdvice.executiveSummary, 172);
    doc.text(splitSummary, 18, y + 13);
    y += 28;
  }

  // Category breakdown table
  const categoryExpenses: { [id: string]: { name: string; amount: number; budget: number } } = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = categoryMap.get(t.categoryId);
      const catName = cat ? cat.name : 'Otras';
      if (!categoryExpenses[t.categoryId]) {
        categoryExpenses[t.categoryId] = {
          name: catName,
          amount: 0,
          budget: cat?.monthlyBudget || 0,
        };
      }
      categoryExpenses[t.categoryId].amount += t.amount;
    });

  const categoryTableData = Object.values(categoryExpenses)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => {
      const pct = totalExpense > 0 ? ((c.amount / totalExpense) * 100).toFixed(1) + '%' : '0%';
      const budgetText = c.budget > 0 ? formatCurrency(c.budget, settings) : 'Sin límite';
      const status = c.budget > 0 ? (c.amount > c.budget ? 'EXCEDIDO ⚠️' : 'En regla ✅') : '-';
      return [c.name, formatCurrency(c.amount, settings), pct, budgetText, status];
    });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Desglose de Gastos por Categoría', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Categoría', 'Gasto Real', '% del Total', 'Presupuesto', 'Estado']],
    body: categoryTableData.length > 0 ? categoryTableData : [['Sin gastos registrados', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;

  // Transactions list
  if (finalY > 230) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detalle de Transacciones Recientes', 14, finalY);
  finalY += 4;

  const txTableData = transactions.slice(0, 40).map((t) => {
    const catName = categoryMap.get(t.categoryId)?.name || 'General';
    const accName = accountMap.get(t.accountId)?.name || 'Cuenta';
    const typeLabel = t.type === 'income' ? '+ Ingreso' : t.type === 'expense' ? '- Gasto' : '⇄ Transf.';
    const amountStr = (t.type === 'income' ? '+' : '-') + ' ' + formatCurrency(t.amount, settings);
    return [
      formatDate(t.date),
      t.description,
      catName,
      accName,
      typeLabel,
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: finalY,
    head: [['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Tipo', 'Monto']],
    body: txTableData.length > 0 ? txTableData : [['No hay transacciones en este periodo', '', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount} | FinanFlow por Insights Solutions SAS (insights.com.co)`, 14, 290);
  }

  doc.save(`FinanFlow-Reporte-${periodName.replace(/\s+/g, '_')}.pdf`);
}

// 2. CSV Export
export function exportToCSV(transactions: Transaction[], categories: Category[], accounts: Account[]) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = ['ID', 'Fecha', 'Tipo', 'Monto', 'Descripcion', 'Categoria', 'Cuenta', 'Etiquetas', 'Notas', 'Fuente'];
  
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    t.amount.toFixed(2),
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(catMap.get(t.categoryId) || '').replace(/"/g, '""')}"`,
    `"${(accMap.get(t.accountId) || '').replace(/"/g, '""')}"`,
    `"${(t.tags || []).join(';')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    t.source || 'manual',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FinanFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 3. CSV Import Parser Engine
export interface CSVImportResult {
  validCount: number;
  skippedCount: number;
  parsedTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
  discoveredAccounts: Account[];
  discoveredCategories: Category[];
  detectedApp: string;
  errors: string[];
}

export function parseCSVTransactions(
  csvText: string,
  existingCategories: Category[],
  existingAccounts: Account[],
  currency: string = 'COP'
): CSVImportResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return {
      validCount: 0,
      skippedCount: 0,
      parsedTransactions: [],
      discoveredAccounts: existingAccounts,
      discoveredCategories: existingCategories,
      detectedApp: 'Desconocido',
      errors: ['El archivo está vacío o no contiene filas de datos válidas.'],
    };
  }

  // Helper to split CSV row taking quotes into account
  const tokenizeLine = (line: string, delim: string): string[] => {
    const cols: string[] = [];
    let insideQuotes = false;
    let token = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"' || ch === "'") {
        insideQuotes = !insideQuotes;
      } else if (ch === delim && !insideQuotes) {
        cols.push(token.trim().replace(/^["']|["']$/g, ''));
        token = '';
      } else {
        token += ch;
      }
    }
    cols.push(token.trim().replace(/^["']|["']$/g, ''));
    return cols;
  };

  // Step 1: Locate the actual Header row (in AndroMoney, line 0 is metadata, header is line 1)
  let headerRowIndex = 0;
  let delimiter = ',';
  let bestScore = -1;

  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const candidateLine = lines[i];
    const candidateDelim = candidateLine.includes(';') ? ';' : candidateLine.includes('\t') ? '\t' : ',';
    const tokens = tokenizeLine(candidateLine, candidateDelim).map((t) => t.toLowerCase());

    let score = 0;
    if (tokens.some((t) => t.includes('monto') || t.includes('amount') || t.includes('importe') || t.includes('valor'))) score += 3;
    if (tokens.some((t) => t.includes('categor') || t.includes('rubro'))) score += 3;
    if (tokens.some((t) => t.includes('fecha') || t.includes('date'))) score += 3;
    if (tokens.some((t) => t.includes('gasto') || t.includes('ingreso') || t.includes('transferir'))) score += 4;
    if (tokens.some((t) => t.includes('cuenta') || t.includes('account') || t.includes('banco'))) score += 2;
    if (tokens.some((t) => t.includes('id') || t.includes('divisas'))) score += 1;

    if (score > bestScore && score >= 3) {
      bestScore = score;
      headerRowIndex = i;
      delimiter = candidateDelim;
    }
  }

  const rawHeaders = tokenizeLine(lines[headerRowIndex], delimiter).map((h) => h.toLowerCase());
  const headerStr = rawHeaders.join('|');

  let detectedApp = 'CSV Estándar';
  if (
    headerStr.includes('andromoney') ||
    headerStr.includes('sub-categor') ||
    headerStr.includes('subcategor') ||
    headerStr.includes('transferir afuera') ||
    headerStr.includes('transferir a') ||
    lines[0].toLowerCase().includes('andromoney')
  ) {
    detectedApp = 'AndroMoney Export';
  } else if (headerStr.includes('money manager') || headerStr.includes('moneymanager')) {
    detectedApp = 'Money Manager';
  } else if (headerStr.includes('bancolombia') || headerStr.includes('davivienda')) {
    detectedApp = 'Extracto Bancario';
  }

  // Column Indexes
  const amountIdx = rawHeaders.findIndex((h) => h.includes('monto') || h.includes('amount') || h.includes('importe') || h.includes('valor'));
  const catIdx = rawHeaders.findIndex((h) => (h.includes('categor') || h.includes('rubro')) && !h.includes('sub'));
  const subCatIdx = rawHeaders.findIndex((h) => h.includes('sub-categor') || h.includes('subcategor') || h.includes('sub_categor'));
  const dateIdx = rawHeaders.findIndex((h) => h.includes('fecha') || h.includes('date'));
  
  // AndroMoney: Gasto(Transferir afuera) = Source Account, Ingreso(Transferir a) = Destination Account
  const fromAccountIdx = rawHeaders.findIndex((h) => 
    h.includes('transferir afuera') || 
    h.includes('gasto(') || 
    h.includes('gasto (') ||
    (h.includes('cuenta') && !h.includes('destino') && !h.includes('a cuenta') && !h.includes('hacia')) ||
    (h.includes('account') && !h.includes('to') && !h.includes('dest'))
  );

  const toAccountIdx = rawHeaders.findIndex((h) => 
    h.includes('transferir a') || 
    h.includes('ingreso(') || 
    h.includes('ingreso (') ||
    h.includes('to account') || 
    h.includes('a cuenta') || 
    h.includes('cuenta destino') || 
    h.includes('hacia')
  );

  const noteIdx = rawHeaders.findIndex((h) => h.includes('nota') || h.includes('note') || h.includes('memo') || h.includes('comentario'));
  const payeeIdx = rawHeaders.findIndex((h) => h.includes('beneficiario') || h.includes('pagador') || h.includes('payee') || h.includes('comercio'));
  const projectIdx = rawHeaders.findIndex((h) => h.includes('proyecto') || h.includes('project') || h.includes('periodic'));
  const descIdx = rawHeaders.findIndex((h) => h.includes('desc') || h.includes('concepto') || h.includes('detalle'));
  const typeIdx = rawHeaders.findIndex((h) => h.includes('tipo') || h.includes('type') || h.includes('gasto/ingreso') || h.includes('expense/income'));

  // Account Meta Helper
  const getAccountMeta = (name: string): { type: 'bank' | 'card' | 'cash' | 'savings'; icon: string; color: string } => {
    const lower = name.toLowerCase();
    if (lower.includes('bancolombia')) return { type: 'bank', icon: 'Building2', color: '#eab308' };
    if (lower.includes('davivienda')) return { type: 'bank', icon: 'Building2', color: '#ef4444' };
    if (lower.includes('villas') || lower.includes('av villas')) return { type: 'bank', icon: 'Building2', color: '#3b82f6' };
    if (lower.includes('banco') || lower.includes('bank')) return { type: 'bank', icon: 'Building2', color: '#2563eb' };
    if (lower.includes('falabella') || lower.includes('éxito') || lower.includes('exito') || lower.includes('tuya') || lower.includes('tarjeta') || lower.includes('card') || lower.includes('leon')) {
      return { type: 'card', icon: 'CreditCard', color: '#8b5cf6' };
    }
    if (lower.includes('nequi')) return { type: 'savings', icon: 'Smartphone', color: '#6366f1' };
    if (lower.includes('daviplata')) return { type: 'savings', icon: 'Smartphone', color: '#f43f5e' };
    if (lower.includes('movii') || lower.includes('binance') || lower.includes('ahorr') || lower.includes('savings')) {
      return { type: 'savings', icon: 'Coins', color: '#06b6d4' };
    }
    if (lower.includes('tienda') || lower.includes('rapitienda') || lower.includes('rest.') || lower.includes('chuleta')) {
      return { type: 'cash', icon: 'Store', color: '#f97316' };
    }
    if (lower.includes('caja') || lower.includes('efectivo') || lower.includes('cash')) {
      return { type: 'cash', icon: 'Wallet', color: '#10b981' };
    }
    if (lower.includes('lina') || lower.includes('julieta') || lower.includes('alejandra') || lower.includes('claudia') || lower.includes('oscar') || lower.includes('lociones') || lower.includes('cartagena')) {
      return { type: 'cash', icon: 'User', color: '#ec4899' };
    }
    return { type: 'bank', icon: 'Building2', color: '#64748b' };
  };

  // Category Meta Helper
  const getCategoryMeta = (name: string, fallbackType: 'income' | 'expense'): { type: 'income' | 'expense'; icon: string; color: string } => {
    const lower = name.toLowerCase();
    if (lower.includes('comida') || lower.includes('almuerzo') || lower.includes('ingredientes') || lower.includes('restaurante') || lower.includes('panader')) {
      return { type: 'expense', icon: 'Utensils', color: '#f59e0b' };
    }
    if (lower.includes('carro') || lower.includes('moto') || lower.includes('gasolina') || lower.includes('peaje') || lower.includes('vehiculo')) {
      return { type: 'expense', icon: 'Car', color: '#3b82f6' };
    }
    if (lower.includes('3c') || lower.includes('personal') || lower.includes('peinetas')) {
      return { type: 'expense', icon: 'User', color: '#ec4899' };
    }
    if (lower.includes('mascota') || lower.includes('alimento')) {
      return { type: 'expense', icon: 'Heart', color: '#10b981' };
    }
    if (lower.includes('vivienda') || lower.includes('hogar') || lower.includes('alquiler') || lower.includes('luz') || lower.includes('agua') || lower.includes('gas') || lower.includes('internet')) {
      return { type: 'expense', icon: 'Home', color: '#06b6d4' };
    }
    if (lower.includes('educación') || lower.includes('educacion') || lower.includes('estudio')) {
      return { type: 'expense', icon: 'BookOpen', color: '#6366f1' };
    }
    if (lower.includes('transporte') || lower.includes('taxi') || lower.includes('autobús') || lower.includes('bus')) {
      return { type: 'expense', icon: 'Bus', color: '#f97316' };
    }
    if (lower.includes('ropa') || lower.includes('belleza') || lower.includes('pantalón') || lower.includes('camisa') || lower.includes('zapato')) {
      return { type: 'expense', icon: 'ShoppingBag', color: '#d946ef' };
    }
    if (lower.includes('entretenimiento') || lower.includes('cine') || lower.includes('fiesta') || lower.includes('pelicula') || lower.includes('música') || lower.includes('spotify') || lower.includes('netflix')) {
      return { type: 'expense', icon: 'Tv', color: '#8b5cf6' };
    }
    if (lower.includes('medicina') || lower.includes('salud') || lower.includes('farmacia') || lower.includes('ortodoncia')) {
      return { type: 'expense', icon: 'Activity', color: '#14b8a6' };
    }
    if (lower.includes('social') || lower.includes('regalo') || lower.includes('niños')) {
      return { type: 'expense', icon: 'Users', color: '#f43f5e' };
    }
    if (lower.includes('cuota') || lower.includes('deuda')) {
      return { type: 'expense', icon: 'CreditCard', color: '#ef4444' };
    }
    if (lower.includes('inversión') || lower.includes('inversion') || lower.includes('btc')) {
      return { type: 'expense', icon: 'TrendingUp', color: '#eab308' };
    }
    if (lower.includes('inventario') || lower.includes('lociones')) {
      return { type: 'expense', icon: 'Package', color: '#0ea5e9' };
    }
    if (lower.includes('prestamo') || lower.includes('préstamo')) {
      return { type: 'expense', icon: 'HandCoins', color: '#f59e0b' };
    }
    if (lower.includes('ingreso') || lower.includes('salario') || lower.includes('sueldo') || lower.includes('viáticos') || lower.includes('viaticos')) {
      return { type: 'income', icon: 'ArrowUpRight', color: '#10b981' };
    }
    if (lower.includes('marketing') || lower.includes('publicidad') || lower.includes('diseño') || lower.includes('software') || lower.includes('web')) {
      return { type: 'income', icon: 'Megaphone', color: '#8b5cf6' };
    }
    if (lower.includes('venta') || lower.includes('ventas')) {
      return { type: 'income', icon: 'DollarSign', color: '#10b981' };
    }
    if (lower.includes('clase') || lower.includes('clases')) {
      return { type: 'income', icon: 'GraduationCap', color: '#3b82f6' };
    }
    if (lower.includes('transferencia')) {
      return { type: 'expense', icon: 'ArrowRightLeft', color: '#64748b' };
    }
    return { type: fallbackType, icon: 'Layers', color: '#64748b' };
  };

  const discoveredAccountsMap = new Map<string, Account>();
  const discoveredCategoriesMap = new Map<string, Category>();

  existingAccounts.forEach((a) => discoveredAccountsMap.set(a.name.toLowerCase().trim(), { ...a }));
  existingCategories.forEach((c) => discoveredCategoriesMap.set(c.name.toLowerCase().trim(), { ...c }));

  // Helper to get or create Account
  const getOrCreateAccount = (accountName: string, initialBalance: number = 0): string => {
    const cleanName = accountName.trim();
    if (!cleanName) return existingAccounts[0]?.id || 'acc-1';

    const key = cleanName.toLowerCase();
    let acc = discoveredAccountsMap.get(key);
    if (!acc) {
      const meta = getAccountMeta(cleanName);
      const newId = 'acc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      acc = {
        id: newId,
        name: cleanName,
        type: meta.type,
        initialBalance: initialBalance,
        currentBalance: initialBalance,
        currency: currency,
        color: meta.color,
        icon: meta.icon,
      };
      discoveredAccountsMap.set(key, acc);
    } else if (initialBalance > 0 && acc.initialBalance === 0) {
      acc.initialBalance = initialBalance;
      acc.currentBalance = initialBalance;
    }
    return acc.id;
  };

  // Helper to get or create Category
  const getOrCreateCategory = (catName: string, defaultType: 'income' | 'expense'): string => {
    const cleanName = catName.trim() || 'Otros';
    const key = cleanName.toLowerCase();
    let cat = discoveredCategoriesMap.get(key);
    if (!cat) {
      const meta = getCategoryMeta(cleanName, defaultType);
      const newId = 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      cat = {
        id: newId,
        name: cleanName,
        type: meta.type,
        color: meta.color,
        icon: meta.icon,
        monthlyBudget: 0,
      };
      discoveredCategoriesMap.set(key, cat);
    }
    return cat.id;
  };

  const candidateTransactions: Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = [];
  let skipped = 0;
  const errors: string[] = [];

  // Step 2: Iterate over rows starting after headerRowIndex
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = tokenizeLine(line, delimiter);

    if (cols.length < 2 || cols.every((v) => !v.trim())) {
      continue;
    }

    const rawCat = (catIdx !== -1 && cols[catIdx] ? cols[catIdx].trim() : '') || 'Otros';
    const rawSubCat = subCatIdx !== -1 && cols[subCatIdx] ? cols[subCatIdx].trim() : '';
    const rawAmountStr = amountIdx !== -1 && cols[amountIdx] ? cols[amountIdx].trim() : '0';
    const rawFrom = fromAccountIdx !== -1 && cols[fromAccountIdx] ? cols[fromAccountIdx].trim() : '';
    const rawTo = toAccountIdx !== -1 && cols[toAccountIdx] ? cols[toAccountIdx].trim() : '';
    const rawDate = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx].trim() : '';
    const rawPayee = payeeIdx !== -1 && cols[payeeIdx] ? cols[payeeIdx].trim() : '';
    const rawNote = noteIdx !== -1 && cols[noteIdx] ? cols[noteIdx].trim() : '';
    const rawProject = projectIdx !== -1 && cols[projectIdx] ? cols[projectIdx].trim() : '';
    const rawDesc = descIdx !== -1 && cols[descIdx] ? cols[descIdx].trim() : '';

    const cleanAmountStr = rawAmountStr.replace(/[^0-9.-]/g, '');
    const amountVal = Math.abs(parseFloat(cleanAmountStr) || 0);

    // 2.1 Handle AndroMoney SYSTEM / INIT_AMOUNT lines (Account initial balance definitions)
    if (rawCat.toUpperCase() === 'SYSTEM' || rawSubCat.toUpperCase() === 'INIT_AMOUNT' || rawDate === '10100101') {
      const initAccountName = rawTo || rawFrom;
      if (initAccountName) {
        getOrCreateAccount(initAccountName, amountVal);
      }
      continue; // Initial balances are applied to Account.initialBalance, not logged as transactions
    }

    if (amountVal === 0) {
      skipped++;
      continue;
    }

    // 2.2 Date parsing
    let parsedDate = new Date().toISOString().slice(0, 10);
    if (rawDate) {
      const compactMatch = rawDate.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (compactMatch) {
        parsedDate = `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
      } else if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(rawDate)) {
        parsedDate = rawDate.replace(/\//g, '-').replace(/\./g, '-');
      } else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(rawDate)) {
        const parts = rawDate.split(/[-/.]/);
        parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // 2.3 Transaction Type determination
    let type: 'expense' | 'income' | 'transfer' = 'expense';
    const lowerCat = rawCat.toLowerCase();
    const lowerType = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx].toLowerCase().trim() : '';

    if (lowerCat.includes('transferencia') || lowerCat.includes('transfer') || (rawFrom && rawTo && lowerType.includes('transfer'))) {
      type = 'transfer';
    } else if (
      lowerCat.includes('ingreso') ||
      lowerCat.includes('income') ||
      lowerCat.includes('salario') ||
      lowerCat.includes('ventas') ||
      lowerCat.includes('marketing') ||
      lowerCat.includes('clases') ||
      lowerType.includes('income') ||
      lowerType.includes('ingreso') ||
      lowerType === '1' ||
      (!rawFrom && rawTo)
    ) {
      type = 'income';
    } else {
      type = 'expense';
    }

    // 2.4 Account & Category resolution
    let accountId = '';
    let toAccountId: string | undefined = undefined;

    if (type === 'transfer') {
      const fromAcc = rawFrom || 'Efectivo';
      const toAcc = rawTo || 'Ahorrar';
      accountId = getOrCreateAccount(fromAcc);
      toAccountId = getOrCreateAccount(toAcc);
    } else if (type === 'income') {
      const accName = rawTo || rawFrom || 'Efectivo';
      accountId = getOrCreateAccount(accName);
    } else {
      const accName = rawFrom || rawTo || 'Efectivo';
      accountId = getOrCreateAccount(accName);
    }

    const categoryId = getOrCreateCategory(rawCat, type === 'income' ? 'income' : 'expense');

    // 2.5 Description resolution
    let description = '';
    if (rawPayee && rawNote) {
      description = `${rawPayee} - ${rawNote}`;
    } else if (rawPayee) {
      description = rawPayee;
    } else if (rawNote) {
      description = rawNote;
    } else if (rawDesc) {
      description = rawDesc;
    } else if (rawSubCat) {
      description = `${rawCat}: ${rawSubCat}`;
    } else {
      description = rawCat || 'Movimiento AndroMoney';
    }

    const tags: string[] = ['andromoney-import'];
    if (rawSubCat && !tags.includes(rawSubCat.toLowerCase())) {
      tags.push(rawSubCat.toLowerCase());
    }
    if (rawProject && !tags.includes(rawProject.toLowerCase())) {
      tags.push(rawProject.toLowerCase());
    }

    const notes = [
      `Importado de ${detectedApp}`,
      rawSubCat ? `Subcategoría: ${rawSubCat}` : '',
      rawProject ? `Proyecto: ${rawProject}` : '',
      rawNote ? `Nota: ${rawNote}` : '',
    ].filter(Boolean).join(' • ');

    candidateTransactions.push({
      type,
      amount: Math.round(amountVal * 100) / 100,
      date: parsedDate,
      categoryId,
      accountId,
      toAccountId,
      description: description.trim(),
      notes,
      tags,
      source: 'csv',
    });
  }

  return {
    validCount: candidateTransactions.length,
    skippedCount: skipped,
    parsedTransactions: candidateTransactions,
    discoveredAccounts: Array.from(discoveredAccountsMap.values()),
    discoveredCategories: Array.from(discoveredCategoriesMap.values()),
    detectedApp,
    errors,
  };
}

