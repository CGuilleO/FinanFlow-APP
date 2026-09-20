import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  Share2,
  Download,
  FileText,
  Tag,
  Search,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Copy,
  Printer,
  X,
  ChevronDown,
  Info,
  CalendarRange,
  Flame,
  Check,
  Building2,
  Wallet,
  ArrowUpDown
} from 'lucide-react';
import { Account, Category, Transaction, UserSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';
import {
  generateStatisticalPDFReport,
  generateShareableSummaryText,
  exportFilteredTransactionsCSV,
  StatisticalReportData,
} from '../utils/statisticalReportGenerator';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onNavigateToTransactions?: (tag?: string) => void;
  onOpenNewTransaction?: () => void;
}

type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'all_time'
  | 'custom';

type ChartViewType = 'categories' | 'trend' | 'tags' | 'weekday' | 'concepts';

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  accounts,
  settings,
  onNavigateToTransactions,
}) => {
  // ----------------------------------------------------
  // 1. FILTER STATES
  // ----------------------------------------------------
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this_month');

  // Compute dates based on preset
  const { initialStart, initialEnd } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const startOfMonth = new Date(y, m, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(y, m + 1, 0).toISOString().split('T')[0];

    return { initialStart: startOfMonth, initialEnd: endOfMonth };
  }, []);

  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);

  // Other filters
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchConcept, setSearchConcept] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // UI States
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(true);
  const [activeChartView, setActiveChartView] = useState<ChartViewType>('categories');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  // Interactive Hover / Inspection State
  const [inspectedItem, setInspectedItem] = useState<{
    title: string;
    subtitle?: string;
    amount: number;
    percentage: number;
    count: number;
    color?: string;
    type?: 'category' | 'tag' | 'date' | 'concept';
    rawId?: string;
  } | null>(null);

  // ----------------------------------------------------
  // 2. PRESET HANDLERS
  // ----------------------------------------------------
  const handleRangePresetChange = (preset: DateRangePreset) => {
    setRangePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'this_month') {
      setStartDate(new Date(y, m, 1).toISOString().split('T')[0]);
      setEndDate(new Date(y, m + 1, 0).toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      setStartDate(new Date(y, m - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(y, m, 0).toISOString().split('T')[0]);
    } else if (preset === 'last_30_days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'last_90_days') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(past90.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === 'all_time') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  const resetAllFilters = () => {
    handleRangePresetChange('this_month');
    setSelectedType('all');
    setSelectedCategoryIds([]);
    setSelectedTags([]);
    setSearchConcept('');
    setSelectedAccountId('all');
    setMinAmount('');
    setMaxAmount('');
    setInspectedItem(null);
  };

  // ----------------------------------------------------
  // 3. ALL DISTINCT TAGS FROM TRANSACTIONS
  // ----------------------------------------------------
  const allAvailableTags = useMemo(() => {
    const tagCountMap: Record<string, number> = {};
    transactions.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        const clean = tag.trim().toLowerCase();
        if (clean) {
          tagCountMap[clean] = (tagCountMap[clean] || 0) + 1;
        }
      });
    });
    return Object.entries(tagCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [transactions]);

  // ----------------------------------------------------
  // 4. FILTERED TRANSACTIONS
  // ----------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Date filter
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Type filter
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Account filter
      if (selectedAccountId !== 'all') {
        if (t.accountId !== selectedAccountId && t.toAccountId !== selectedAccountId) {
          return false;
        }
      }

      // Categories filter
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) {
        return false;
      }

      // Tags filter (transaction must have at least one of the selected tags)
      if (selectedTags.length > 0) {
        const txTags = (t.tags || []).map((tg) => tg.toLowerCase());
        const hasTag = selectedTags.some((st) => txTags.includes(st.toLowerCase()));
        if (!hasTag) return false;
      }

      // Concept / Description text search
      if (searchConcept.trim()) {
        const q = searchConcept.toLowerCase();
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const notesMatch = (t.notes || '').toLowerCase().includes(q);
        if (!descMatch && !notesMatch) return false;
      }

      // Min & Max amount filters
      if (minAmount && !isNaN(Number(minAmount)) && t.amount < Number(minAmount)) {
        return false;
      }
      if (maxAmount && !isNaN(Number(maxAmount)) && t.amount > Number(maxAmount)) {
        return false;
      }

      return true;
    });
  }, [
    transactions,
    startDate,
    endDate,
    selectedType,
    selectedAccountId,
    selectedCategoryIds,
    selectedTags,
    searchConcept,
    minAmount,
    maxAmount,
  ]);

  // ----------------------------------------------------
  // 5. CALCULATED METRICS & KPIS
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeTxCount = 0;
    let expenseTxCount = 0;
    let highestExpenseTx: Transaction | undefined;

    filteredTransactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        incomeTxCount += 1;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
        expenseTxCount += 1;
        if (!highestExpenseTx || t.amount > highestExpenseTx.amount) {
          highestExpenseTx = t;
        }
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;

    // Number of days in range
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
    const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const avgDailyExpense = daysCount > 0 ? totalExpense / daysCount : 0;
    const avgTicketExpense = expenseTxCount > 0 ? totalExpense / expenseTxCount : 0;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
      avgDailyExpense,
      daysCount,
      avgTicketExpense,
      highestExpenseTx,
      txCount: filteredTransactions.length,
      incomeTxCount,
      expenseTxCount,
    };
  }, [filteredTransactions, startDate, endDate]);

  // ----------------------------------------------------
  // 6. CATEGORY BREAKDOWN
  // ----------------------------------------------------
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string; amount: number; count: number }> = {};

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = categoryMap.get(t.categoryId);
        const id = t.categoryId || 'other';
        const name = cat ? cat.name : 'Otras / Sin categoría';
        const color = cat ? cat.color : '#64748B';

        if (!map[id]) {
          map[id] = { id, name, color, amount: 0, count: 0 };
        }
        map[id].amount += t.amount;
        map[id].count += 1;
      });

    const total = metrics.totalExpense;
    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
        avg: item.count > 0 ? item.amount / item.count : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categoryMap, metrics.totalExpense]);

  // ----------------------------------------------------
  // 7. TAGS BREAKDOWN
  // ----------------------------------------------------
  const tagBreakdown = useMemo(() => {
    const map: Record<string, { tag: string; amount: number; count: number }> = {};
    const total = metrics.totalExpense;

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        (t.tags || []).forEach((tag) => {
          const clean = tag.trim().toLowerCase();
          if (!clean) return;
          if (!map[clean]) {
            map[clean] = { tag: clean, amount: 0, count: 0 };
          }
          map[clean].amount += t.amount;
          map[clean].count += 1;
        });
      });

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, metrics.totalExpense]);

  // ----------------------------------------------------
  // 8. TOP CONCEPTS / DESCRIPTIONS BREAKDOWN
  // ----------------------------------------------------
  const topConcepts = useMemo(() => {
    const map: Record<string, { description: string; amount: number; count: number }> = {};
    const total = metrics.totalExpense;

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const clean = (t.description || 'Sin concepto').trim();
        if (!map[clean]) {
          map[clean] = { description: clean, amount: 0, count: 0 };
        }
        map[clean].amount += t.amount;
        map[clean].count += 1;
      });

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredTransactions, metrics.totalExpense]);

  // ----------------------------------------------------
  // 9. WEEKDAY DISTRIBUTION
  // ----------------------------------------------------
  const weekdayDistribution = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const buckets = days.map((d, i) => ({ dayName: d, dayIndex: i, amount: 0, count: 0 }));

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const [y, m, d] = t.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayIdx = dateObj.getDay();
        buckets[dayIdx].amount += t.amount;
        buckets[dayIdx].count += 1;
      });

    const maxAmt = Math.max(...buckets.map((b) => b.amount), 1);
    return buckets.map((b) => ({
      ...b,
      relativeHeight: (b.amount / maxAmt) * 100,
      percentage: metrics.totalExpense > 0 ? (b.amount / metrics.totalExpense) * 100 : 0,
    }));
  }, [filteredTransactions, metrics.totalExpense]);

  // ----------------------------------------------------
  // 10. TEMPORAL TREND (MONTHLY / WEEKLY BUCKETS)
  // ----------------------------------------------------
  const trendBuckets = useMemo(() => {
    const map: Record<string, { label: string; income: number; expense: number; balance: number }> = {};

    filteredTransactions.forEach((t) => {
      // Group by YYYY-MM if multi-month, otherwise group by week/day
      const monthKey = t.date.slice(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        const [y, m] = monthKey.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, 1);
        const label = dateObj.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        map[monthKey] = {
          label: label.charAt(0).toUpperCase() + label.slice(1),
          income: 0,
          expense: 0,
          balance: 0,
        };
      }

      if (t.type === 'income') map[monthKey].income += t.amount;
      if (t.type === 'expense') map[monthKey].expense += t.amount;
      map[monthKey].balance = map[monthKey].income - map[monthKey].expense;
    });

    const sortedKeys = Object.keys(map).sort();
    const data = sortedKeys.map((k) => ({ key: k, ...map[k] }));

    const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 100);
    return { data, maxVal };
  }, [filteredTransactions]);

  // ----------------------------------------------------
  // 11. AUTOMATED FINANCIAL INSIGHTS & SUGGESTIONS
  // ----------------------------------------------------
  const insights = useMemo(() => {
    const list: { type: 'positive' | 'warning' | 'info' | 'tip'; title: string; description: string }[] = [];

    // 1. Tasa de Ahorro
    if (metrics.totalIncome > 0) {
      if (metrics.savingsRate >= 20) {
        list.push({
          type: 'positive',
          title: `Excelente Tasa de Ahorro (${metrics.savingsRate}%)`,
          description: `Estás logrando ahorrar más del 20% recomendado por la regla 50/30/20. Continúa consolidando tu fondo de emergencia o inversiones.`,
        });
      } else if (metrics.savingsRate > 0) {
        list.push({
          type: 'info',
          title: `Margen de Ahorro Moderado (${metrics.savingsRate}%)`,
          description: `Cuentas con balance positivo, pero tu tasa está por debajo del 20% óptimo. Reducir 1 o 2 gastos no esenciales te permitirá alcanzar la meta ideal.`,
        });
      } else {
        list.push({
          type: 'warning',
          title: `Déficit de Flujo de Caja en el Periodo`,
          description: `Tus gastos (${formatCurrency(metrics.totalExpense, settings)}) superan tus ingresos (${formatCurrency(metrics.totalIncome, settings)}). Revisa gastos urgentes y evita usar endeudamiento con tarjeta para consumo corriente.`,
        });
      }
    }

    // 2. Concentración de Riesgo en Categorías
    if (categoryBreakdown.length > 0) {
      const topCat = categoryBreakdown[0];
      if (topCat.percentage >= 40) {
        list.push({
          type: 'warning',
          title: `Alta Concentración en "${topCat.name}" (${topCat.percentage.toFixed(1)}%)`,
          description: `El ${topCat.percentage.toFixed(1)}% de tus gastos se concentra en una sola categoría (${formatCurrency(topCat.amount, settings)}). Considera presupuestar límites semanales para balancear tu flujo.`,
        });
      }
    }

    // 3. Gastos Hormiga o Pequeños Gastos Frecuentes
    const smallExpenses = filteredTransactions.filter((t) => t.type === 'expense' && t.amount <= metrics.avgTicketExpense * 0.3);
    if (smallExpenses.length >= 5) {
      const smallSum = smallExpenses.reduce((sum, t) => sum + t.amount, 0);
      const smallPct = metrics.totalExpense > 0 ? (smallSum / metrics.totalExpense) * 100 : 0;
      if (smallPct >= 8) {
        list.push({
          type: 'tip',
          title: `Detección de "Gastos Hormiga" (${smallExpenses.length} compras pequeñas)`,
          description: `Los micro-gastos representan ${formatCurrency(smallSum, settings)} (${smallPct.toFixed(1)}% del gasto total). Llevar control detallado de cafés, snacks o domicilios menores puede ahorrarte una suma considerable.`,
        });
      }
    }

    // 4. Día con mayor gasto
    const topWeekday = [...weekdayDistribution].sort((a, b) => b.amount - a.amount)[0];
    if (topWeekday && topWeekday.percentage >= 25 && topWeekday.amount > 0) {
      list.push({
        type: 'info',
        title: `Pico de Consumo los ${topWeekday.dayName}`,
        description: `Los ${topWeekday.dayName} concentran el ${topWeekday.percentage.toFixed(1)}% de tus desembolsos (${formatCurrency(topWeekday.amount, settings)}). Revisa si coincide con salidas de fin de semana o pagos fijos automáticos.`,
      });
    }

    // 5. Proyección si se mantiene el ritmo
    if (metrics.avgDailyExpense > 0) {
      const projectedMonth = metrics.avgDailyExpense * 30;
      list.push({
        type: 'tip',
        title: `Proyección de Gasto Mensual: ${formatCurrency(projectedMonth, settings)}`,
        description: `Con tu ritmo diario actual de ${formatCurrency(metrics.avgDailyExpense, settings)}/día, tu proyección estándar a 30 días se ubica en este rango.`,
      });
    }

    return list;
  }, [metrics, categoryBreakdown, filteredTransactions, weekdayDistribution, settings]);

  // ----------------------------------------------------
  // 12. SHARING & EXPORT HANDLERS
  // ----------------------------------------------------
  const reportDataForExport: StatisticalReportData = useMemo(() => {
    const presetLabelMap: Record<DateRangePreset, string> = {
      this_month: 'Este Mes',
      last_month: 'Mes Anterior',
      last_30_days: 'Últimos 30 días',
      last_90_days: 'Últimos 90 días',
      this_year: 'Este Año',
      all_time: 'Histórico Total',
      custom: 'Rango Personalizado',
    };

    return {
      filteredTransactions,
      allTransactions: transactions,
      categories,
      accounts,
      settings,
      filters: {
        startDate,
        endDate,
        rangePresetLabel: presetLabelMap[rangePreset],
        categoryIds: selectedCategoryIds,
        tags: selectedTags,
        searchConcept,
        type: selectedType,
        accountId: selectedAccountId,
      },
      metrics,
      categoryBreakdown,
      tagBreakdown,
      topConcepts,
      insights,
    };
  }, [
    filteredTransactions,
    transactions,
    categories,
    accounts,
    settings,
    startDate,
    endDate,
    rangePreset,
    selectedCategoryIds,
    selectedTags,
    searchConcept,
    selectedType,
    selectedAccountId,
    metrics,
    categoryBreakdown,
    tagBreakdown,
    topConcepts,
    insights,
  ]);

  const handleShareReport = async () => {
    const summaryText = generateShareableSummaryText(reportDataForExport);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Informe Estadístico FinanFlow',
          text: summaryText,
        });
        showToast('¡Informe compartido exitosamente!');
        return;
      } catch (err) {
        // Fallback to clipboard if user dismissed share sheet
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(summaryText);
      showToast('¡Resumen ejecutivo copiado al portapapeles listo para WhatsApp o email!');
    } catch (err) {
      showToast('No se pudo copiar automáticamente.');
    }
  };

  const handleDownloadPDF = () => {
    generateStatisticalPDFReport(reportDataForExport);
    showToast('¡Informe en PDF descargado exitosamente!');
  };

  const handleDownloadCSV = () => {
    exportFilteredTransactionsCSV(filteredTransactions, categories, accounts);
    showToast('¡Archivo CSV descargado con éxito!');
  };

  const showToast = (msg: string) => {
    setShareSuccessToast(msg);
    setTimeout(() => setShareSuccessToast(null), 3500);
  };

  // Cross-filter: Click on category or tag to drill-down
  const handleDrilldownCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleDrilldownTag = (tag: string) => {
    const clean = tag.toLowerCase();
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter((t) => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  // SVG Donut calculation constants
  const donutRadius = 80;
  const donutStrokeWidth = 26;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedAngle = 0;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* 1. HEADER & ACTIONS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Informes & Estadísticas
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Interactivo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filtros cruzados multidimensionales, gráficos interactivos con inspección en vivo y exportación oficial
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Ayuda y Guía de Métricas"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Ayuda & Guía</span>
          </button>

          <button
            onClick={handleShareReport}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Compartir Resumen"
          >
            <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Compartir</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Descargar datos en Excel / CSV"
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
            title="Descargar Informe Estadístico en PDF"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Share Toast Notification */}
      {shareSuccessToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{shareSuccessToast}</span>
          </div>
          <button onClick={() => setShareSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. INTERACTIVE FILTER CONSOLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Filtros Avanzados de la Sesión
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({filteredTransactions.length} de {transactions.length} movimientos)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAllFilters}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Restablecer
            </button>
            <button
              onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              title="Colapsar / Expandir filtros"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isFilterPanelExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Date Range Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Rango:
          </span>
          {(
            [
              { id: 'this_month', label: 'Este mes' },
              { id: 'last_month', label: 'Mes anterior' },
              { id: 'last_30_days', label: 'Últimos 30 días' },
              { id: 'last_90_days', label: 'Últimos 90 días' },
              { id: 'this_year', label: 'Este año' },
              { id: 'all_time', label: 'Histórico' },
              { id: 'custom', label: 'Personalizado' },
            ] as const
          ).map((p) => {
            const active = rangePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleRangePresetChange(p.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Filters Detail */}
        {isFilterPanelExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in">
            {/* Date Pickers */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Desde (Fecha Inicio)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangePreset('custom');
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Hasta (Fecha Fin)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangePreset('custom');
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Concept / Keyword Live Search */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Concepto o Descripción
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchConcept}
                  onChange={(e) => setSearchConcept(e.target.value)}
                  placeholder="Ej: Mercado, Luz, Nómina..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                {searchConcept && (
                  <button
                    onClick={() => setSearchConcept('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Account / Wallet Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Cuenta o Medio de Pago
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="all">Todas las cuentas</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Tipo de Movimiento
              </label>
              <div className="flex gap-1.5">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'expense', label: 'Solo Gastos' },
                  { id: 'income', label: 'Solo Ingresos' },
                  { id: 'transfer', label: 'Transferencias' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id as any)}
                    className={`flex-1 py-1 px-2 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedType === t.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min / Max Amount */}
            <div className="sm:col-span-2 flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Monto Mínimo ({settings.currency})
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Monto Máximo ({settings.currency})
                </label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Sin tope"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Multi-Select Category Pills */}
            <div className="sm:col-span-2 lg:col-span-4 pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <PieChart className="w-3 h-3 text-indigo-500" /> Filtrar por Categorías ({categories.length}):
                </span>
                {selectedCategoryIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCategoryIds([])}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Limpiar selección ({selectedCategoryIds.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {categories.map((c) => {
                  const isSelected = selectedCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleDrilldownCategory(c.id)}
                      className={`px-2 py-1 text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs ring-2 ring-indigo-300 dark:ring-indigo-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                      />
                      <span>{c.name}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi-Select Tags Pills */}
            {allAvailableTags.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-500" /> Filtrar por Etiquetas (#tags):
                  </span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      Limpiar etiquetas ({selectedTags.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {allAvailableTags.map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        onClick={() => handleDrilldownTag(t.name)}
                        className={`px-2 py-0.5 text-[10px] rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>#{t.name}</span>
                        <span className="text-[9px] opacity-70">({t.count})</span>
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Ingresos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ingresos Totales
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalIncome, settings)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.incomeTxCount} transacciones en el periodo
            </p>
          </div>
        </div>

        {/* Card 2: Gastos */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Gastos Totales
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.totalExpense, settings)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.expenseTxCount} transacciones registradas
            </p>
          </div>
        </div>

        {/* Card 3: Balance Neto & Tasa de Ahorro */}
        <div
          className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-xs relative overflow-hidden group ${
            metrics.netBalance >= 0
              ? 'border-indigo-200/80 dark:border-indigo-900/40'
              : 'border-amber-200/80 dark:border-amber-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Balance Neto
            </span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                metrics.savingsRate >= 20
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {metrics.savingsRate}% Ahorro
            </span>
          </div>
          <div className="mt-2">
            <p
              className={`text-xl sm:text-2xl font-black ${
                metrics.netBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'
              }`}
            >
              {formatCurrency(metrics.netBalance, settings)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {metrics.netBalance >= 0 ? 'Superávit en el periodo' : 'Déficit en el periodo'}
            </p>
          </div>
        </div>

        {/* Card 4: Gasto Promedio Diario */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Ritmo de Gasto Diario
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <CalendarRange className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(metrics.avgDailyExpense, settings)}
              <span className="text-xs font-normal text-slate-400">/día</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Ticket promedio: {formatCurrency(metrics.avgTicketExpense, settings)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE LIVE INSPECTOR BAR ("según vaya señalando") */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/50 to-indigo-50/90 dark:from-indigo-950/40 dark:via-sky-950/20 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: inspectedItem?.color || '#6366f1' }}
          >
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {inspectedItem ? `Inspeccionando: ${inspectedItem.type}` : 'Inspección Interactiva en Tiempo Real:'}
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {inspectedItem ? inspectedItem.title : 'Pasa el cursor o pulsa cualquier gráfico o categoría'}
              </span>
            </div>
            {inspectedItem && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Monto: <strong className="text-slate-900 dark:text-white">{formatCurrency(inspectedItem.amount, settings)}</strong>
                {' '}• Representa el <strong className="text-indigo-600 dark:text-indigo-400">{inspectedItem.percentage.toFixed(1)}%</strong> del gasto filtrado
                {' '}• ({inspectedItem.count} operaciones)
              </p>
            )}
          </div>
        </div>

        {inspectedItem?.rawId && inspectedItem.type === 'category' && (
          <button
            onClick={() => handleDrilldownCategory(inspectedItem.rawId!)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 shadow-2xs shrink-0 cursor-pointer"
          >
            {selectedCategoryIds.includes(inspectedItem.rawId!) ? 'Quitar filtro categoría' : 'Filtrar solo esta categoría'}
          </button>
        )}
      </div>

      {/* 5. INTERACTIVE CHARTS HUB (TABBED VIEWS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
        {/* Navigation Selector between Chart Views */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Perspectiva Visual y Gráficos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecciona una vista gráfica para profundizar en la distribución de tus finanzas
            </p>
          </div>

          {/* Chart selector tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setActiveChartView('categories')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeChartView === 'categories'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Categorías</span>
            </button>

            <button
              onClick={() => setActiveChartView('trend')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeChartView === 'trend'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tendencia Mensual</span>
            </button>

            <button
              onClick={() => setActiveChartView('tags')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeChartView === 'tags'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Etiquetas (#tags)</span>
            </button>

            <button
              onClick={() => setActiveChartView('weekday')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeChartView === 'weekday'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Días de la semana</span>
            </button>

            <button
              onClick={() => setActiveChartView('concepts')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeChartView === 'concepts'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Top Conceptos</span>
            </button>
          </div>
        </div>

        {/* --- VIEW 1: CATEGORIES INTERACTIVE DONUT --- */}
        {activeChartView === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* SVG Donut */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center py-4">
              {metrics.totalExpense > 0 && categoryBreakdown.length > 0 ? (
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r={donutRadius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth={donutStrokeWidth}
                      className="text-slate-200 dark:text-slate-800"
                    />
                    {categoryBreakdown.map((item) => {
                      const strokeDashoffset = donutCircumference - (item.percentage / 100) * donutCircumference;
                      const rotation = accumulatedAngle;
                      accumulatedAngle += (item.percentage / 100) * 360;

                      const isInspected = inspectedItem?.title === item.name;

                      return (
                        <circle
                          key={item.id}
                          cx="100"
                          cy="100"
                          r={donutRadius}
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth={isInspected ? donutStrokeWidth + 5 : donutStrokeWidth}
                          strokeDasharray={`${donutCircumference} ${donutCircumference}`}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform={`rotate(${rotation} 100 100)`}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() =>
                            setInspectedItem({
                              title: item.name,
                              amount: item.amount,
                              percentage: item.percentage,
                              count: item.count,
                              color: item.color,
                              type: 'category',
                              rawId: item.id,
                            })
                          }
                          onClick={() => handleDrilldownCategory(item.id)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
                      {inspectedItem?.title || 'Gasto Total'}
                    </span>
                    <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(inspectedItem ? inspectedItem.amount : metrics.totalExpense, settings)}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {inspectedItem
                        ? `${inspectedItem.percentage.toFixed(1)}% del total`
                        : `${categoryBreakdown.length} categorías`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <PieChart className="w-10 h-10 mx-auto opacity-40 mb-2" />
                  <p className="text-xs">No hay gastos en el periodo filtrado</p>
                </div>
              )}
            </div>

            {/* Breakdown List with Interactive Hover and Drill-down */}
            <div className="lg:col-span-7 space-y-2 max-h-80 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Categoría & Frecuencia</span>
                <span>Monto & Porcentaje</span>
              </div>
              {categoryBreakdown.map((item) => {
                const isInspected = inspectedItem?.title === item.name;
                const isSelected = selectedCategoryIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() =>
                      setInspectedItem({
                        title: item.name,
                        amount: item.amount,
                        percentage: item.percentage,
                        count: item.count,
                        color: item.color,
                        type: 'category',
                        rawId: item.id,
                      })
                    }
                    onClick={() => handleDrilldownCategory(item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700'
                        : isInspected
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          {item.name}
                          {isSelected && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                              (Filtrada)
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.count} movimientos • Prom: {formatCurrency(item.avg, settings)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount, settings)}
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(item.percentage, 100)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- VIEW 2: TEMPORAL TREND BAR CHART --- */}
        {activeChartView === 'trend' && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-end gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span>Gastos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-500" />
                <span>Balance Neto</span>
              </div>
            </div>

            {/* Grid of monthly bars */}
            {trendBuckets.data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 h-56 items-end pt-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                {trendBuckets.data.map((item) => {
                  const incHeight = (item.income / trendBuckets.maxVal) * 100;
                  const expHeight = (item.expense / trendBuckets.maxVal) * 100;
                  const savingsPositive = item.balance >= 0;

                  return (
                    <div
                      key={item.key}
                      onMouseEnter={() =>
                        setInspectedItem({
                          title: `Mes: ${item.label}`,
                          amount: item.expense,
                          percentage: metrics.totalExpense > 0 ? (item.expense / metrics.totalExpense) * 100 : 0,
                          count: 0,
                          color: '#6366f1',
                          type: 'date',
                        })
                      }
                      className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    >
                      {/* Floating tooltip */}
                      <div className="absolute -top-16 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2.5 pointer-events-none z-30 shadow-xl whitespace-nowrap border border-slate-700">
                        <span className="font-bold text-slate-200">{item.label}</span>
                        <span className="text-emerald-400 font-semibold">
                          Ingresos: {formatCurrency(item.income, settings)}
                        </span>
                        <span className="text-rose-400 font-semibold">
                          Gastos: {formatCurrency(item.expense, settings)}
                        </span>
                        <span className={savingsPositive ? 'text-indigo-300' : 'text-amber-400'}>
                          Neto: {formatCurrency(item.balance, settings)}
                        </span>
                      </div>

                      {/* Bars */}
                      <div className="flex items-end gap-1.5 w-full justify-center h-44">
                        <div
                          style={{ height: `${Math.max(incHeight, 4)}%` }}
                          className="w-3 sm:w-4 bg-emerald-500 group-hover:bg-emerald-600 rounded-t transition-all duration-300"
                        />
                        <div
                          style={{ height: `${Math.max(expHeight, 4)}%` }}
                          className="w-3 sm:w-4 bg-rose-500 group-hover:bg-rose-600 rounded-t transition-all duration-300"
                        />
                      </div>

                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs">No hay datos suficientes para graficar tendencia temporal</p>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 3: TAGS BREAKDOWN --- */}
        {activeChartView === 'tags' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Muestra las etiquetas (#tags) que consumen más capital. Haz clic en cualquiera para aislarla en el informe.
            </p>

            {tagBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {tagBreakdown.map((t) => {
                  const isSelected = selectedTags.includes(t.tag);
                  return (
                    <div
                      key={t.tag}
                      onMouseEnter={() =>
                        setInspectedItem({
                          title: `#${t.tag}`,
                          amount: t.amount,
                          percentage: t.percentage,
                          count: t.count,
                          color: '#4f46e5',
                          type: 'tag',
                        })
                      }
                      onClick={() => handleDrilldownTag(t.tag)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            #{t.tag}
                            {isSelected && <span className="text-[10px] text-indigo-600 font-normal">(Activa)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t.count} movimientos asociados
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(t.amount, settings)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${Math.min(t.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {t.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Tag className="w-8 h-8 mx-auto opacity-40 mb-2" />
                <p className="text-xs">No hay etiquetas (#tags) en las transacciones del periodo filtrado</p>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 4: WEEKDAY DISTRIBUTION --- */}
        {activeChartView === 'weekday' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Descubre qué días de la semana representan tus mayores picos de desembolso de dinero.
            </p>

            <div className="grid grid-cols-7 gap-2 sm:gap-3 h-52 items-end pt-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              {weekdayDistribution.map((d) => (
                <div
                  key={d.dayName}
                  onMouseEnter={() =>
                    setInspectedItem({
                      title: `Día: ${d.dayName}`,
                      amount: d.amount,
                      percentage: d.percentage,
                      count: d.count,
                      color: '#0284c7',
                      type: 'date',
                    })
                  }
                  className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 pointer-events-none z-20 shadow-lg whitespace-nowrap">
                    <span className="font-bold">{d.dayName}</span>
                    <span>{formatCurrency(d.amount, settings)}</span>
                    <span className="text-sky-300">{d.percentage.toFixed(1)}%</span>
                  </div>

                  {/* Bar */}
                  <div className="w-full flex justify-center h-40 items-end">
                    <div
                      style={{ height: `${Math.max(d.relativeHeight, 4)}%` }}
                      className="w-full max-w-[28px] bg-sky-500 hover:bg-sky-600 rounded-t-lg transition-all duration-300"
                    />
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2">
                    {d.dayName}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {d.count} movs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VIEW 5: TOP CONCEPTS --- */}
        {activeChartView === 'concepts' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Top 10 conceptos o descripciones más frecuentes o con mayor impacto acumulado.
            </p>

            {topConcepts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                      <th className="pb-2">Concepto / Descripción</th>
                      <th className="pb-2 text-center">Frecuencia</th>
                      <th className="pb-2 text-right">Gasto Acumulado</th>
                      <th className="pb-2 text-right">% del Gasto</th>
                      <th className="pb-2 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topConcepts.map((c) => (
                      <tr
                        key={c.description}
                        onMouseEnter={() =>
                          setInspectedItem({
                            title: c.description,
                            amount: c.amount,
                            percentage: c.percentage,
                            count: c.count,
                            color: '#8b5cf6',
                            type: 'concept',
                          })
                        }
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                          {c.description}
                        </td>
                        <td className="py-2.5 text-center text-slate-500">
                          {c.count} veces
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(c.amount, settings)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                          {c.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSearchConcept(c.description)}
                            className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            Filtrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs">No hay conceptos registrados en este periodo</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. AUTOMATED FINANCIAL INSIGHTS & SUGGESTIONS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Diagnóstico & Sugerencias Inteligentes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hallazgos calculados matemáticamente sobre tus datos filtrados
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                ins.type === 'positive'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                  : ins.type === 'warning'
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  ins.type === 'positive'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : ins.type === 'warning'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                }`}
              >
                {ins.type === 'positive' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : ins.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {ins.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. DETAILED FILTERED MOVEMENTS PREVIEW TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registros Incluidos en este Informe ({filteredTransactions.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar todo en Excel
            </button>
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                <tr className="text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Concepto</th>
                  <th className="py-2">Categoría</th>
                  <th className="py-2">Cuenta</th>
                  <th className="py-2">Etiquetas</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.slice(0, 30).map((t) => {
                  const cat = categoryMap.get(t.categoryId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 text-slate-500 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-2 font-semibold text-slate-900 dark:text-white">
                        {t.description}
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat?.color || '#94a3b8' }}
                          />
                          {cat?.name || 'Otras'}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">
                        {accounts.find((a) => a.id === t.accountId)?.name || 'General'}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(t.tags || []).slice(0, 3).map((tg) => (
                            <span
                              key={tg}
                              onClick={() => handleDrilldownTag(tg)}
                              className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:underline"
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className={`py-2 text-right font-bold whitespace-nowrap ${
                          t.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, settings)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTransactions.length > 30 && (
              <p className="text-[11px] text-center text-slate-400 py-2 border-t border-slate-100 dark:border-slate-800">
                Mostrando los primeros 30 movimientos. Descarga el PDF o CSV para ver la totalidad.
              </p>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <Filter className="w-8 h-8 mx-auto opacity-40 mb-2" />
            <p className="text-xs">No hay movimientos que coincidan con los filtros aplicados</p>
            <button
              onClick={resetAllFilters}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* 8. HELP & METRICS GUIDELINES MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Guía y Ayudas: Cómo Interpretar tus Informes
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-indigo-500" /> Inspección Interactiva (Hover & Drill-down)
                </h4>
                <p>
                  Al señalar o pulsar sobre cualquier sector de un gráfico, categoría o etiqueta, la barra de inspección se actualiza al instante. Si haces clic en una categoría o etiqueta, la sesión aplicará un filtro cruzado para analizar únicamente ese segmento.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Tasa de Ahorro Saludable
                </h4>
                <p>
                  Representa el porcentaje de tus ingresos que no fue consumido en gastos. El estándar financiero internacional (regla 50/30/20) recomienda un mínimo del <strong>20% de ahorro</strong> para contingencias y metas futuras.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-500" /> Concentración de Riesgo
                </h4>
                <p>
                  Si una sola categoría (por ejemplo Alquiler o Restaurantes) supera el <strong>40%</strong> de tus gastos totales, el sistema te alertará para evitar vulnerabilidad ante imprevistos.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-sky-500" /> Exportar y Compartir
                </h4>
                <p>
                  Puedes generar un documento formal en <strong>PDF</strong> con membrete corporativo (In Sights Solutions SAS) listo para imprimir o presentar, descargar la base de datos en <strong>CSV para Excel</strong>, o usar <strong>Compartir</strong> para enviar un resumen ejecutivo por WhatsApp o correo.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
