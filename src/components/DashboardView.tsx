import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Sparkles,
  Camera,
  Mic,
  MessageSquare,
  Plus,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  ChevronRight,
  BarChart2,
  PieChart,
  Layers,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Calendar,
  Mail,
  HandCoins,
  Bell
} from 'lucide-react';
import { Account, BillReminder, Category, Transaction, UserSettings } from '../types';
import { formatCurrency, formatDate } from '../utils/storage';
import { CategoryDonutChart, IncomeExpenseBarChart, WeeklySpendingChart } from './Charts/CustomCharts';
import { IconRenderer } from './IconRenderer';
import { DashboardDrilldownModal, DrilldownType } from './Modals/DashboardDrilldownModal';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  bills: BillReminder[];
  settings: UserSettings;
  onOpenNewTransaction: () => void;
  onEditTransaction?: (tx: Transaction) => void;
  onOpenOCR: () => void;
  onOpenVoice: () => void;
  onOpenSMS: () => void;
  onOpenGmail?: () => void;
  onNavigateToTransactions: (filterTag?: string) => void;
  onNavigateToBudgets: () => void;
  onNavigateToBills: () => void;
  onNavigateToAdvisor: () => void;
  onRefreshData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  accounts,
  bills,
  settings,
  onOpenNewTransaction,
  onEditTransaction,
  onOpenOCR,
  onOpenVoice,
  onOpenSMS,
  onOpenGmail,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onNavigateToBills,
  onNavigateToAdvisor,
  onRefreshData,
}) => {
  const [drilldownType, setDrilldownType] = useState<DrilldownType | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [initialDrilldownCatId, setInitialDrilldownCatId] = useState<string | null>(null);
  const [initialDrilldownAccId, setInitialDrilldownAccId] = useState<string | null>(null);

  // In-place recent list filters
  const [recentSearch, setRecentSearch] = useState('');
  const [recentType, setRecentType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [recentLimit, setRecentLimit] = useState<number | 'all'>(7);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthName = prevMonthDate.toLocaleDateString('es-ES', { month: 'short' });

  const categoryMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);

  // Ensure transactions are chronologically sorted (newest date first)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateComp = (b.date || '').localeCompare(a.date || '');
      if (dateComp !== 0) return dateComp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [transactions]);

  // Current month totals
  const currentMonthTxs = useMemo(() => {
    return sortedTransactions.filter((t) => t.date.startsWith(currentMonthKey));
  }, [sortedTransactions, currentMonthKey]);

  const currentIncome = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTxs]);

  const currentExpense = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTxs]);

  const netSavings = currentIncome - currentExpense;
  const savingsRate = currentIncome > 0 ? Math.round((netSavings / currentIncome) * 100) : 0;

  // Previous month totals for visual comparison
  const prevMonthTxs = useMemo(() => {
    return sortedTransactions.filter((t) => t.date.startsWith(prevMonthKey));
  }, [sortedTransactions, prevMonthKey]);

  const prevIncome = useMemo(() => {
    return prevMonthTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevMonthTxs]);

  const prevExpense = useMemo(() => {
    return prevMonthTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevMonthTxs]);

  const prevNetSavings = prevIncome - prevExpense;
  const prevSavingsRate = prevIncome > 0 ? Math.round((prevNetSavings / prevIncome) * 100) : 0;

  // Differences vs previous month
  const incomeChangePct = prevIncome > 0 ? Math.round(((currentIncome - prevIncome) / prevIncome) * 100) : null;
  const expenseChangePct = prevExpense > 0 ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100) : null;
  const netSavingsDiff = netSavings - prevNetSavings;

  // Total net worth
  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // Total budget & Category budget calculation
  const totalBudget = categories
    .filter((c) => c.type === 'expense' && (c.monthlyBudget || 0) > 0)
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

  const budgetUsageRate = totalBudget > 0 ? Math.round((currentExpense / totalBudget) * 100) : 0;

  // Overbudget categories alert
  const overBudgetCategories = categories
    .filter((c) => c.type === 'expense' && (c.monthlyBudget || 0) > 0)
    .map((c) => {
      const spent = currentMonthTxs
        .filter((t) => t.type === 'expense' && t.categoryId === c.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const pct = Math.round((spent / (c.monthlyBudget || 1)) * 100);
      return { ...c, spent, pct };
    })
    .filter((c) => c.pct >= settings.budgetAlertThreshold);

  // Upcoming bills due in next 5 days or overdue
  const upcomingBills = bills.filter((b) => {
    if (b.status === 'paid') return false;
    const diffDays = Math.ceil((new Date(b.dueDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 5;
  });

  // Filtered recent transactions for in-place dashboard view
  const filteredRecentTxs = useMemo(() => {
    let list = sortedTransactions;
    if (recentType !== 'all') {
      list = list.filter((t) => t.type === recentType);
    }
    if (recentSearch.trim()) {
      const q = recentSearch.toLowerCase();
      list = list.filter((t) => {
        const descMatch = t.description.toLowerCase().includes(q);
        const catMatch = (categoryMap.get(t.categoryId)?.name || '').toLowerCase().includes(q);
        const accMatch = (accountMap.get(t.accountId)?.name || '').toLowerCase().includes(q);
        const tagMatch = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        const amountMatch = t.amount.toString().includes(q);
        return descMatch || catMatch || accMatch || tagMatch || amountMatch;
      });
    }
    if (recentLimit === 'all') {
      return list;
    }
    return list.slice(0, recentLimit);
  }, [sortedTransactions, recentType, recentSearch, recentLimit, categoryMap, accountMap]);

  const openDrilldown = (type: DrilldownType, catId?: string, accId?: string) => {
    setInitialDrilldownCatId(catId || null);
    setInitialDrilldownAccId(accId || null);
    setDrilldownType(type);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* 1. Quick Intelligent Input Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 dark:from-indigo-950 dark:via-indigo-900 dark:to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow backdrop decorative */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Asistente Financiero Activo
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              ¿Qué movimiento deseas registrar hoy?
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-xl">
              Captura fotos de tickets, dicta por voz, o comparte/pega comprobantes de Nequi, Daviplata, billeteras digitales y SMS con auto-categorización por IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenOCR}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              Escanear Ticket
            </button>
            <button
              onClick={onOpenVoice}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-rose-300" />
              Dictar por Voz
            </button>
            <button
              onClick={onOpenSMS}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-cyan-300" />
              Billeteras / SMS
            </button>
            {onOpenGmail && (
              <button
                onClick={onOpenGmail}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-red-300" />
                Gmail Facturas
              </button>
            )}
            <button
              onClick={onOpenNewTransaction}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Manual
            </button>
          </div>
        </div>
      </div>

      {/* 2. Critical Alerts Section (Budget Exceeded / Upcoming Bills) */}
      {(overBudgetCategories.length > 0 || upcomingBills.length > 0) && (
        <div className="space-y-3">
          {/* Overbudget warnings */}
          {overBudgetCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={onNavigateToBudgets}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-md ${
                cat.pct >= 100
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${cat.pct >= 100 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">
                    {cat.pct >= 100
                      ? `¡Límite Excedido en ${cat.name}!`
                      : `Alerta de Presupuesto: ${cat.name} al ${cat.pct}%`}
                  </h4>
                  <p className="text-[11px] opacity-80">
                    Has gastado {formatCurrency(cat.spent, settings)} de un presupuesto de {formatCurrency(cat.monthlyBudget || 0, settings)}.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 shadow-sm">
                Ver Presupuestos →
              </span>
            </div>
          ))}

          {/* Upcoming bills alerts & Loan payment alerts */}
          {upcomingBills.map((bill) => {
            const isLoan = bill.isLoanReminder;
            return (
              <div
                key={bill.id}
                onClick={onNavigateToBills}
                className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-md ${
                  isLoan
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${isLoan ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                    {isLoan ? <HandCoins className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold flex items-center gap-1.5">
                      {isLoan ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] uppercase font-black">
                            Alerta Préstamo (1 día antes)
                          </span>
                          {bill.title}
                        </>
                      ) : (
                        `Recordatorio de Factura Próxima: ${bill.title}`
                      )}
                    </h4>
                    <p className="text-[11px] opacity-85">
                      Vencimiento: <strong>{formatDate(bill.dueDate)}</strong> • Total a Pagar: <strong>{formatCurrency(bill.amount, settings)}</strong>
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm ${
                    isLoan
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                      : 'bg-white/80 dark:bg-slate-900/80 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  {isLoan ? 'Ver Préstamo →' : 'Pagar Factura →'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Executive Financial Metrics Cards (ALL INTERACTIVE WITH DRILLDOWNS & COMPARISON) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos del Mes */}
        <div
          onClick={() => openDrilldown('income')}
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Ingresos del Mes
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(currentIncome, settings)}
            </div>

            {/* Visual comparison vs previous month */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {incomeChangePct !== null ? (
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    incomeChangePct >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {incomeChangePct >= 0 ? '+' : ''}
                  {incomeChangePct}%
                </span>
              ) : null}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                vs {prevMonthName} ({formatCurrency(prevIncome, settings)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {currentMonthTxs.filter((t) => t.type === 'income').length} entradas
            </span>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
              Profundizar <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 2: Gastos del Mes */}
        <div
          onClick={() => openDrilldown('expense')}
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Gastos del Mes
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(currentExpense, settings)}
            </div>

            {/* Visual comparison vs previous month */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {expenseChangePct !== null ? (
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    expenseChangePct <= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {expenseChangePct >= 0 ? '+' : ''}
                  {expenseChangePct}%
                </span>
              ) : null}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                vs {prevMonthName} ({formatCurrency(prevExpense, settings)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {totalBudget > 0 ? `${budgetUsageRate}% presupuesto` : 'Sin límite fijado'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center gap-0.5 transition-colors">
              Ver Desglose <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 3: Ahorro Neto */}
        <div
          onClick={() => openDrilldown('savings')}
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Ahorro Neto ({savingsRate}%)
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>

            <div className={`text-xl sm:text-2xl font-black ${netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(netSavings, settings)}
            </div>

            {/* Visual comparison vs previous month */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  netSavingsDiff >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                }`}
              >
                {netSavingsDiff >= 0 ? '+' : ''}
                {formatCurrency(netSavingsDiff, settings)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                vs {prevMonthName} ({formatCurrency(prevNetSavings, settings)})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {netSavings >= 0 ? 'Superávit disponible' : 'Déficit mensual'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-0.5 transition-colors">
              Diagnóstico <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 4: Patrimonio Neto / Cuentas */}
        <div
          onClick={() => openDrilldown('net_worth')}
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Patrimonio en Cuentas
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalNetWorth, settings)}
            </div>

            {/* Liquidity description */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Liquidez total disponible
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {accounts.length} cuentas activas
            </span>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 flex items-center gap-0.5 transition-colors">
              Ver Cuentas <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* 4. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Donut Categories (2 cols) */}
        <div
          onClick={() => setDrilldownType('category_distribution')}
          className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Distribución de Gastos por Categoría
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                  Toca para desglose
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pasa el cursor para ver el total o pulsa para profundizar en cada rubro
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Profundizar <ChevronRight className="w-4 h-4" />
            </span>
          </div>

          <CategoryDonutChart
            transactions={currentMonthTxs}
            categories={categories}
            settings={settings}
          />
        </div>

        {/* Right Column: Weekly spending trend */}
        <div
          onClick={() => setDrilldownType('weekly_spending')}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Gasto Diario (Últimos 7 días)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300">
                  Detalle diario
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitorea tus picos de gasto de la semana
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>

          <WeeklySpendingChart transactions={transactions} settings={settings} />

          {/* AI Advisor Mini Callout */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToAdvisor();
              }}
              className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between cursor-pointer group/callout hover:bg-indigo-100/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Informe de Ahorro con IA
                </span>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold group-hover/callout:translate-x-0.5 transition-transform">
                Analizar →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Historical Trend Bar Chart */}
      <div
        onClick={() => setDrilldownType('historical_evolution')}
        className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 group"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Evolución Mensual: Ingresos vs Gastos vs Ahorro
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                Toca para tabla histórica
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tendencia semestral para evaluar estabilidad financiera
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            Ver Comparativa <ChevronRight className="w-4 h-4" />
          </span>
        </div>
        <IncomeExpenseBarChart transactions={transactions} settings={settings} />
      </div>

      {/* 6. Recent Transactions List with In-Place Filters & Limit Control */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        {/* Header with Title and Global Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Últimos Movimientos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {sortedTransactions.length} totales
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Toca cualquier movimiento o tarjeta para profundizar en comprobantes, cuentas y categorías
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateToTransactions()}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Ver Todas ({transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
        </div>

        {/* In-Place Quick Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto, comercio, tag o monto..."
              value={recentSearch}
              onChange={(e) => setRecentSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {recentSearch && (
              <button
                onClick={() => setRecentSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills & Quantity Limit */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRecentType(t)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    recentType === t
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t === 'all' && 'Todos'}
                  {t === 'expense' && 'Gastos'}
                  {t === 'income' && 'Ingresos'}
                  {t === 'transfer' && 'Transferencias'}
                </button>
              ))}
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px] hidden sm:inline">Mostrar:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                {([7, 15, 30, 'all'] as const).map((lim) => (
                  <button
                    key={String(lim)}
                    onClick={() => setRecentLimit(lim)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      recentLimit === lim
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {lim === 'all' ? 'Todas' : lim}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tu billetera está en limpio y lista
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Aún no tienes movimientos registrados. Pulsa el botón "Nuevo", escanea un ticket o dicta por voz para ingresar tus datos reales.
                </p>
              </div>
              <button
                onClick={onOpenNewTransaction}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                + Registrar Primer Movimiento
              </button>
            </div>
          ) : filteredRecentTxs.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No se encontraron movimientos con los filtros aplicados
              </p>
              <button
                onClick={() => {
                  setRecentSearch('');
                  setRecentType('all');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            filteredRecentTxs.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const acc = accountMap.get(tx.accountId);
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    setSelectedTxForDetail(tx);
                    setDrilldownType('transaction_detail');
                  }}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl px-3 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm group-hover:scale-105 transition-transform cursor-pointer"
                      style={{ backgroundColor: cat?.color || '#64748B' }}
                      title={`Ver categoría: ${cat?.name || 'General'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrilldown('category_distribution', tx.categoryId);
                      }}
                    >
                      <IconRenderer name={cat?.icon || 'DollarSign'} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tx.description}
                        </h4>
                        {tx.source && tx.source !== 'manual' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {tx.source}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrilldown('category_distribution', tx.categoryId);
                          }}
                        >
                          {cat?.name || 'General'}
                        </span>
                        <span>•</span>
                        <span
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrilldown('net_worth', undefined, tx.accountId);
                          }}
                        >
                          {acc?.name || 'Cuenta'}
                        </span>
                      </div>
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {tx.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToTransactions(tag);
                              }}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md cursor-pointer"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div>
                      <div
                        className={`text-sm font-bold ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                        {formatCurrency(tx.amount, settings)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {isIncome ? 'Ingreso' : isTransfer ? 'Transferencia' : 'Gasto'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. Drilldown Deep-Dive Modal */}
      <DashboardDrilldownModal
        isOpen={drilldownType !== null}
        onClose={() => {
          setDrilldownType(null);
          setSelectedTxForDetail(null);
          setInitialDrilldownCatId(null);
          setInitialDrilldownAccId(null);
        }}
        type={drilldownType}
        initialCategoryId={initialDrilldownCatId}
        initialAccountId={initialDrilldownAccId}
        selectedTransaction={selectedTxForDetail}
        transactions={sortedTransactions}
        categories={categories}
        accounts={accounts}
        bills={bills}
        settings={settings}
        onOpenNewTransaction={onOpenNewTransaction}
        onEditTransaction={onEditTransaction}
        onNavigateToTransactions={onNavigateToTransactions}
        onNavigateToBudgets={onNavigateToBudgets}
        onNavigateToBills={onNavigateToBills}
        onNavigateToAdvisor={onNavigateToAdvisor}
        onRefreshData={onRefreshData}
      />
    </div>
  );
};

