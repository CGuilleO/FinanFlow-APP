import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Tag,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Info,
  Clock,
  DollarSign,
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { Account, BillReminder, Category, Transaction, UserSettings } from '../../types';
import { deleteTransaction, formatCurrency, formatDate } from '../../utils/storage';
import { IconRenderer } from '../IconRenderer';

export type DrilldownType =
  | 'income'
  | 'expense'
  | 'savings'
  | 'net_worth'
  | 'category_distribution'
  | 'weekly_spending'
  | 'historical_evolution'
  | 'transaction_detail';

export type PeriodFilter = 'current_month' | 'previous_month' | 'last_3_months' | 'current_year' | 'all_time';

export interface DrilldownStackItem {
  id: string;
  type: DrilldownType | 'category_detail' | 'account_detail';
  title: string;
  subtitle?: string;
  categoryId?: string;
  accountId?: string;
  transaction?: Transaction;
}

interface DashboardDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DrilldownType | null;
  initialCategoryId?: string | null;
  initialAccountId?: string | null;
  selectedTransaction?: Transaction | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  bills: BillReminder[];
  settings: UserSettings;
  onOpenNewTransaction: () => void;
  onEditTransaction?: (tx: Transaction) => void;
  onNavigateToTransactions: (filterTag?: string) => void;
  onNavigateToBudgets: () => void;
  onNavigateToBills: () => void;
  onNavigateToAdvisor: () => void;
  onRefreshData?: () => void;
}

export const DashboardDrilldownModal: React.FC<DashboardDrilldownModalProps> = ({
  isOpen,
  onClose,
  type,
  initialCategoryId,
  initialAccountId,
  selectedTransaction,
  transactions,
  categories,
  accounts,
  bills,
  settings,
  onOpenNewTransaction,
  onEditTransaction,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onNavigateToBills,
  onNavigateToAdvisor,
  onRefreshData,
}) => {
  // Navigation stack for recursive drilldowns
  const [navStack, setNavStack] = useState<DrilldownStackItem[]>([]);
  
  // Period filter
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  // Local search filter inside current drilldown view
  const [searchTerm, setSearchTerm] = useState('');
  // Local sort order
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  // Account or category sub-type filter
  const [subTypeFilter, setSubTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  const categoryMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map<string, Account>(accounts.map((a) => [a.id, a])), [accounts]);

  // Initialize navigation stack whenever modal opens or initial props change
  useEffect(() => {
    if (!isOpen || !type) {
      setNavStack([]);
      return;
    }

    const baseTitleMap: Record<DrilldownType, string> = {
      income: 'Detalle de Ingresos',
      expense: 'Desglose y Análisis de Gastos',
      savings: 'Diagnóstico de Ahorro y Salud Financiera',
      net_worth: 'Patrimonio y Cuentas',
      category_distribution: 'Gastos por Categoría',
      weekly_spending: 'Ritmo Semanal de Gastos',
      historical_evolution: 'Evolución Histórica Semestral',
      transaction_detail: 'Comprobante del Movimiento',
    };

    if (type === 'transaction_detail' && selectedTransaction) {
      setNavStack([
        {
          id: 'root-tx',
          type: 'transaction_detail',
          title: 'Detalle del Movimiento',
          subtitle: selectedTransaction.description,
          transaction: selectedTransaction,
        },
      ]);
    } else if (type === 'category_distribution' && initialCategoryId) {
      const cat = categoryMap.get(initialCategoryId);
      setNavStack([
        {
          id: 'root-cat-dist',
          type: 'category_distribution',
          title: 'Gastos por Categoría',
        },
        {
          id: `cat-${initialCategoryId}`,
          type: 'category_detail',
          title: cat?.name || 'Categoría',
          subtitle: 'Movimientos de esta categoría',
          categoryId: initialCategoryId,
        },
      ]);
    } else if (type === 'net_worth' && initialAccountId) {
      const acc = accountMap.get(initialAccountId);
      setNavStack([
        {
          id: 'root-net-worth',
          type: 'net_worth',
          title: 'Patrimonio y Cuentas',
        },
        {
          id: `acc-${initialAccountId}`,
          type: 'account_detail',
          title: acc?.name || 'Cuenta',
          subtitle: 'Movimientos y saldo de esta cuenta',
          accountId: initialAccountId,
        },
      ]);
    } else {
      setNavStack([
        {
          id: `root-${type}`,
          type,
          title: baseTitleMap[type],
          subtitle: 'Vista general del período',
          transaction: selectedTransaction || undefined,
        },
      ]);
    }

    setSearchTerm('');
    setSubTypeFilter('all');
  }, [isOpen, type, selectedTransaction, initialCategoryId, initialAccountId]);

  if (!isOpen || navStack.length === 0) return null;

  const currentStep = navStack[navStack.length - 1];

  // Helper to push deeper view
  const pushStep = (item: DrilldownStackItem) => {
    setNavStack((prev) => [...prev, item]);
    setSearchTerm('');
    setSubTypeFilter('all');
  };

  // Helper to go back
  const popStep = () => {
    if (navStack.length > 1) {
      setNavStack((prev) => prev.slice(0, prev.length - 1));
      setSearchTerm('');
      setSubTypeFilter('all');
    } else {
      onClose();
    }
  };

  const jumpToStep = (index: number) => {
    setNavStack((prev) => prev.slice(0, index + 1));
    setSearchTerm('');
    setSubTypeFilter('all');
  };

  // Dates calculation based on Period Filter
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const threeMonthsAgoDate = new Date(currentYear, currentMonth - 2, 1);
  const threeMonthsAgoStr = threeMonthsAgoDate.toISOString().split('T')[0];

  const yearStartStr = `${currentYear}-01-01`;

  // Filter transactions by period
  const periodFilteredTxs = transactions.filter((t) => {
    if (period === 'current_month') return t.date.startsWith(currentMonthKey);
    if (period === 'previous_month') return t.date.startsWith(prevMonthKey);
    if (period === 'last_3_months') return t.date >= threeMonthsAgoStr;
    if (period === 'current_year') return t.date >= yearStartStr;
    return true; // all_time
  });

  const periodName = {
    current_month: `Este Mes (${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`,
    previous_month: `Mes Anterior (${prevMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`,
    last_3_months: 'Últimos 3 Meses',
    current_year: `Año ${currentYear}`,
    all_time: 'Todo el Historial',
  }[period];

  // Aggregates for current period
  const periodIncomeTxs = periodFilteredTxs.filter((t) => t.type === 'income');
  const periodExpenseTxs = periodFilteredTxs.filter((t) => t.type === 'expense');

  const totalIncome = periodIncomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = periodExpenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const daysPassedInMonth = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const avgDailyExpense = daysPassedInMonth > 0 ? totalExpense / daysPassedInMonth : 0;
  const projectedMonthExpense = avgDailyExpense * totalDaysInMonth;

  const totalBudget = categories
    .filter((c) => c.type === 'expense' && (c.monthlyBudget || 0) > 0)
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
  const budgetUsageRate = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

  const handleDeleteTx = (txId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      deleteTransaction(txId);
      if (onRefreshData) onRefreshData();
      popStep();
    }
  };

  // Helper for sorting transactions list
  const applySortAndSearch = (txList: Transaction[]) => {
    let result = [...txList];

    if (subTypeFilter !== 'all') {
      result = result.filter((t) => t.type === subTypeFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((t) => {
        const descMatch = t.description.toLowerCase().includes(q);
        const catMatch = (categoryMap.get(t.categoryId)?.name || '').toLowerCase().includes(q);
        const accMatch = (accountMap.get(t.accountId)?.name || '').toLowerCase().includes(q);
        const tagMatch = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        const amountMatch = t.amount.toString().includes(q);
        return descMatch || catMatch || accMatch || tagMatch || amountMatch;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortBy === 'date_asc') return (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '');
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    return result;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR: Navigation & Breadcrumbs */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {navStack.length > 1 && (
              <button
                onClick={popStep}
                className="p-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1 text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                title="Volver al nivel anterior"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            )}

            <div className="min-w-0">
              {/* Breadcrumb Trail */}
              {navStack.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 overflow-x-auto pb-0.5 custom-scrollbar mb-0.5">
                  {navStack.map((step, idx) => (
                    <React.Fragment key={step.id}>
                      {idx > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                      <button
                        onClick={() => jumpToStep(idx)}
                        className={`hover:underline truncate max-w-[140px] cursor-pointer ${
                          idx === navStack.length - 1
                            ? 'font-bold text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {step.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate flex items-center gap-2">
                {currentStep.title}
              </h2>
              {currentStep.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentStep.subtitle} • {periodName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            {/* Period Selector (Hidden on Transaction Detail) */}
            {currentStep.type !== 'transaction_detail' && (
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="current_month" className="dark:bg-slate-800">Este Mes</option>
                  <option value="previous_month" className="dark:bg-slate-800">Mes Anterior</option>
                  <option value="last_3_months" className="dark:bg-slate-800">Últimos 3 Meses</option>
                  <option value="current_year" className="dark:bg-slate-800">Año {currentYear}</option>
                  <option value="all_time" className="dark:bg-slate-800">Todo el Historial</option>
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {/* ========================================================================= */}
          {/* 1. INCOME DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'income' && (
            <div className="space-y-6">
              {/* Summary Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Total Recibido
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(totalIncome, settings)}
                  </div>
                  <span className="text-xs text-emerald-600/80 mt-1 block">
                    {periodIncomeTxs.length} entradas en {periodName}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Promedio Diario
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(daysPassedInMonth > 0 ? totalIncome / daysPassedInMonth : 0, settings)}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    En base a días transcurridos
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ingreso Mayor
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(
                      periodIncomeTxs.length > 0 ? Math.max(...periodIncomeTxs.map((t) => t.amount)) : 0,
                      settings
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block truncate">
                    {periodIncomeTxs.length > 0
                      ? periodIncomeTxs.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev)).description
                      : 'Sin ingresos'}
                  </span>
                </div>
              </div>

              {/* Breakdown by Account (CLICKABLE TO ACCOUNT DRILLDOWN) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Entradas por Cuenta / Billetera (Toca para profundizar)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {accounts.length} cuentas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map((acc) => {
                    const accIncome = periodIncomeTxs
                      .filter((t) => t.accountId === acc.id)
                      .reduce((s, t) => s + t.amount, 0);
                    if (accIncome === 0) return null;
                    const pct = totalIncome > 0 ? Math.round((accIncome / totalIncome) * 100) : 0;
                    return (
                      <div
                        key={acc.id}
                        onClick={() =>
                          pushStep({
                            id: `acc-${acc.id}`,
                            type: 'account_detail',
                            title: `Cuenta: ${acc.name}`,
                            subtitle: `Saldo actual: ${formatCurrency(acc.currentBalance, settings)}`,
                            accountId: acc.id,
                          })
                        }
                        className="p-3.5 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:scale-105 transition-transform flex-shrink-0"
                            style={{ backgroundColor: acc.color || '#4F46E5' }}
                          >
                            <IconRenderer name={acc.icon || 'CreditCard'} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {acc.name}
                            </p>
                            <span className="text-[10px] text-slate-400">{pct}% del total de entradas</span>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(accIncome, settings)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Historial de Ingresos ({periodIncomeTxs.length})
                  </h3>
                  
                  {/* Search Bar */}
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar en ingresos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  {applySortAndSearch(periodIncomeTxs).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No se encontraron ingresos en este período o filtro.
                    </div>
                  ) : (
                    applySortAndSearch(periodIncomeTxs).map((tx) => {
                      const cat = categoryMap.get(tx.categoryId);
                      const acc = accountMap.get(tx.accountId);
                      return (
                        <div
                          key={tx.id}
                          onClick={() =>
                            pushStep({
                              id: `tx-${tx.id}`,
                              type: 'transaction_detail',
                              title: 'Comprobante de Ingreso',
                              subtitle: tx.description,
                              transaction: tx,
                            })
                          }
                          className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0"
                              style={{ backgroundColor: cat?.color || '#10B981' }}
                            >
                              <IconRenderer name={cat?.icon || 'DollarSign'} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatDate(tx.date)} • {acc?.name || 'Cuenta'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(tx.amount, settings)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. EXPENSE DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'expense' && (
            <div className="space-y-6">
              {/* Summary Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Total Gastado
                  </span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(totalExpense, settings)}
                  </div>
                  <span className="text-xs text-rose-600/80 mt-1 block">
                    {periodExpenseTxs.length} compras y pagos en {periodName}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Gasto Promedio Diario
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(avgDailyExpense, settings)}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Proyección mensual: {formatCurrency(projectedMonthExpense, settings)}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Uso de Presupuesto
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {totalBudget > 0 ? `${budgetUsageRate}%` : 'N/A'}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {totalBudget > 0
                      ? `${formatCurrency(totalExpense, settings)} de ${formatCurrency(totalBudget, settings)}`
                      : 'Presupuesto no configurado'}
                  </span>
                </div>
              </div>

              {/* Categories Progress (CLICKABLE TO CATEGORY DEEP DIVE) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Gastos por Categoría (Toca para ver todos sus movimientos)
                  </h3>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToBudgets();
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Ajustar Presupuestos →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => {
                      const catTxs = periodExpenseTxs.filter((t) => t.categoryId === cat.id);
                      const spent = catTxs.reduce((s, t) => s + t.amount, 0);
                      if (spent === 0 && (!cat.monthlyBudget || cat.monthlyBudget === 0)) return null;
                      const budget = cat.monthlyBudget || 0;
                      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                      const isExceeded = budget > 0 && spent > budget;

                      return (
                        <div
                          key={cat.id}
                          onClick={() =>
                            pushStep({
                              id: `cat-${cat.id}`,
                              type: 'category_detail',
                              title: `Categoría: ${cat.name}`,
                              subtitle: `${catTxs.length} movimientos • Total: ${formatCurrency(spent, settings)}`,
                              categoryId: cat.id,
                            })
                          }
                          className="p-3.5 bg-white dark:bg-slate-800/80 hover:bg-rose-50/30 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 rounded-2xl space-y-2 cursor-pointer transition-all shadow-xs group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                                style={{ backgroundColor: cat.color || '#64748B' }}
                              >
                                <IconRenderer name={cat.icon || 'Tag'} className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                  {cat.name}
                                </span>
                                <span className="text-[10px] text-slate-400">{catTxs.length} transacciones</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                                {formatCurrency(spent, settings)}
                              </span>
                              {budget > 0 && (
                                <span className="text-[10px] text-slate-400 block">
                                  de {formatCurrency(budget, settings)} ({pct}%)
                                </span>
                              )}
                            </div>
                          </div>

                          {budget > 0 && (
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all rounded-full ${
                                  isExceeded ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Historial de Gastos ({periodExpenseTxs.length})
                  </h3>
                  
                  {/* Search Bar */}
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar en gastos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  {applySortAndSearch(periodExpenseTxs).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No se encontraron gastos en este período o filtro.
                    </div>
                  ) : (
                    applySortAndSearch(periodExpenseTxs).map((tx) => {
                      const cat = categoryMap.get(tx.categoryId);
                      const acc = accountMap.get(tx.accountId);
                      return (
                        <div
                          key={tx.id}
                          onClick={() =>
                            pushStep({
                              id: `tx-${tx.id}`,
                              type: 'transaction_detail',
                              title: 'Comprobante de Gasto',
                              subtitle: tx.description,
                              transaction: tx,
                            })
                          }
                          className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0"
                              style={{ backgroundColor: cat?.color || '#EF4444' }}
                            >
                              <IconRenderer name={cat?.icon || 'DollarSign'} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatDate(tx.date)} • {cat?.name || 'General'} • {acc?.name || 'Cuenta'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              -{formatCurrency(tx.amount, settings)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. CATEGORY DEEP DIVE VIEW (Single Category Detail) */}
          {/* ========================================================================= */}
          {currentStep.type === 'category_detail' && currentStep.categoryId && (() => {
            const cat = categoryMap.get(currentStep.categoryId);
            const catTxs = periodFilteredTxs.filter((t) => t.categoryId === currentStep.categoryId);
            const totalSpentInCat = catTxs.reduce((s, t) => s + t.amount, 0);
            const budget = cat?.monthlyBudget || 0;
            const remaining = budget - totalSpentInCat;
            const pct = budget > 0 ? Math.round((totalSpentInCat / budget) * 100) : 0;
            const isExceeded = budget > 0 && totalSpentInCat > budget;

            return (
              <div className="space-y-6">
                {/* Category Header Hero */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/40 dark:from-slate-800 dark:to-purple-950/20 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-md"
                        style={{ backgroundColor: cat?.color || '#9333EA' }}
                      >
                        <IconRenderer name={cat?.icon || 'Tag'} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {cat?.name || 'Categoría'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {catTxs.length} registros en {periodName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(totalSpentInCat, settings)}
                      </div>
                      {budget > 0 && (
                        <span
                          className={`text-xs font-bold block ${
                            isExceeded ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isExceeded
                            ? `Excedido por ${formatCurrency(Math.abs(remaining), settings)} (${pct}%)`
                            : `Disponible: ${formatCurrency(remaining, settings)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {budget > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Consumido: {formatCurrency(totalSpentInCat, settings)}</span>
                        <span>Presupuesto: {formatCurrency(budget, settings)}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isExceeded ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Distribution for this Category */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Cuentas Utilizadas en esta Categoría
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {accounts.map((acc) => {
                      const accSpent = catTxs.filter((t) => t.accountId === acc.id).reduce((s, t) => s + t.amount, 0);
                      if (accSpent === 0) return null;
                      const accPct = totalSpentInCat > 0 ? Math.round((accSpent / totalSpentInCat) * 100) : 0;
                      return (
                        <div
                          key={acc.id}
                          onClick={() =>
                            pushStep({
                              id: `acc-${acc.id}`,
                              type: 'account_detail',
                              title: `Cuenta: ${acc.name}`,
                              subtitle: `Saldo: ${formatCurrency(acc.currentBalance, settings)}`,
                              accountId: acc.id,
                            })
                          }
                          className="p-3 bg-white dark:bg-slate-800/80 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between cursor-pointer transition-colors shadow-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: acc.color || '#4F46E5' }}
                            >
                              <IconRenderer name={acc.icon || 'CreditCard'} className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                              {acc.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {formatCurrency(accSpent, settings)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{accPct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All Transactions in this Category */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Movimientos ({catTxs.length})
                    </h4>
                    
                    <div className="relative max-w-xs w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por concepto o monto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    {applySortAndSearch(catTxs).length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No hay movimientos registrados en esta categoría con los filtros actuales.
                      </div>
                    ) : (
                      applySortAndSearch(catTxs).map((tx) => {
                        const acc = accountMap.get(tx.accountId);
                        return (
                          <div
                            key={tx.id}
                            onClick={() =>
                              pushStep({
                                id: `tx-${tx.id}`,
                                type: 'transaction_detail',
                                title: 'Detalle del Movimiento',
                                subtitle: tx.description,
                                transaction: tx,
                              })
                            }
                            className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0"
                                style={{ backgroundColor: cat?.color || '#9333EA' }}
                              >
                                <IconRenderer name={cat?.icon || 'Tag'} className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {tx.description}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatDate(tx.date)} • {acc?.name || 'Cuenta'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                -{formatCurrency(tx.amount, settings)}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* 4. ACCOUNT DEEP DIVE VIEW (Single Account Detail) */}
          {/* ========================================================================= */}
          {currentStep.type === 'account_detail' && currentStep.accountId && (() => {
            const acc = accountMap.get(currentStep.accountId);
            const accTxs = periodFilteredTxs.filter(
              (t) => t.accountId === currentStep.accountId || t.toAccountId === currentStep.accountId
            );
            const accIncome = accTxs.filter((t) => t.type === 'income' && t.accountId === currentStep.accountId).reduce((s, t) => s + t.amount, 0);
            const accExpense = accTxs.filter((t) => t.type === 'expense' && t.accountId === currentStep.accountId).reduce((s, t) => s + t.amount, 0);
            const netFlow = accIncome - accExpense;

            return (
              <div className="space-y-6">
                {/* Account Header Hero */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-cyan-50/40 dark:from-slate-800 dark:to-cyan-950/20 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-md"
                        style={{ backgroundColor: acc?.color || '#06B6D4' }}
                      >
                        <IconRenderer name={acc?.icon || 'CreditCard'} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {acc?.name || 'Cuenta'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {(acc?.type as string) === 'bank'
                            ? 'Cuenta Bancaria'
                            : (acc?.type as string) === 'card'
                            ? 'Tarjeta de Crédito / Débito'
                            : (acc?.type as string) === 'cash'
                            ? 'Efectivo'
                            : (acc?.type as string) === 'savings'
                            ? 'Ahorros'
                            : (acc?.type as string) === 'crypto'
                            ? 'Cripto'
                            : 'Inversión'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Saldo Actual</span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(acc?.currentBalance || 0, settings)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Ingresos</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(accIncome, settings)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Gastos</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                        -{formatCurrency(accExpense, settings)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Flujo Neto</span>
                      <span className={`text-xs font-black ${netFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(netFlow, settings)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Type Filter for Account */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                    {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSubTypeFilter(t)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          subTypeFilter === t
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        {t === 'all' && 'Todos'}
                        {t === 'expense' && 'Gastos'}
                        {t === 'income' && 'Ingresos'}
                        {t === 'transfer' && 'Transferencias'}
                      </button>
                    ))}
                  </div>

                  <div className="relative max-w-xs w-full sm:w-auto">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar en cuenta..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* All Transactions in this Account */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  {applySortAndSearch(accTxs).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No hay movimientos en esta cuenta con los filtros seleccionados.
                    </div>
                  ) : (
                    applySortAndSearch(accTxs).map((tx) => {
                      const cat = categoryMap.get(tx.categoryId);
                      const isIncome = tx.type === 'income';
                      const isTransfer = tx.type === 'transfer';

                      return (
                        <div
                          key={tx.id}
                          onClick={() =>
                            pushStep({
                              id: `tx-${tx.id}`,
                              type: 'transaction_detail',
                              title: 'Detalle del Movimiento',
                              subtitle: tx.description,
                              transaction: tx,
                            })
                          }
                          className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0"
                              style={{ backgroundColor: cat?.color || '#64748B' }}
                            >
                              <IconRenderer name={cat?.icon || 'DollarSign'} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatDate(tx.date)} • {cat?.name || 'General'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs font-bold ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isTransfer
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                              {formatCurrency(tx.amount, settings)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* ========================================================================= */}
          {/* 5. SAVINGS DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'savings' && (
            <div className="space-y-6">
              {/* Savings Health Banner */}
              <div
                className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  netSavings >= 0
                    ? 'bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30 border-indigo-200 dark:border-indigo-800'
                    : 'bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border-rose-200 dark:border-rose-800'
                }`}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-4 h-4" /> Diagnóstico de Capacidad de Ahorro
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(netSavings, settings)}{' '}
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">({savingsRate}%)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
                    {savingsRate >= 20
                      ? '¡Excelente! Estás superando la regla dorada del 20% de ahorro mensual recomendada por expertos.'
                      : savingsRate > 0
                      ? 'Tienes un superávit positivo. Puedes optimizar gastos discrecionales para alcanzar el 20% ideal.'
                      : 'Tus gastos superan tus ingresos este mes. Revisa los rubros no esenciales para equilibrar tus finanzas.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAdvisor();
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  Asesor Financiero IA
                </button>
              </div>

              {/* 50/30/20 Rule Breakdown Comparison */}
              <div className="p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Estructura 50 / 30 / 20 Sugerida
                  </h3>
                  <span className="text-[10px] text-slate-400">Basado en tus ingresos de {periodName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      50% Necesidades Básicas
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                      {formatCurrency(totalIncome * 0.5, settings)}
                    </span>
                    <span className="text-[10px] text-slate-400">Vivienda, Servicios, Comida</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      30% Deseos & Ocio
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                      {formatCurrency(totalIncome * 0.3, settings)}
                    </span>
                    <span className="text-[10px] text-slate-400">Salidas, Suscripciones, Compras</span>
                  </div>

                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">
                      20% Ahorro e Inversión
                    </span>
                    <span className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {formatCurrency(totalIncome * 0.2, settings)}
                    </span>
                    <span className="text-[10px] text-indigo-400">Fondo de emergencia / Metas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. NET WORTH & ACCOUNTS DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'net_worth' && (
            <div className="space-y-6">
              {/* Total Net Worth Box */}
              <div className="p-5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                    Patrimonio Consolidado en Cuentas
                  </span>
                  <div className="text-3xl font-black mt-1">{formatCurrency(totalNetWorth, settings)}</div>
                  <span className="text-xs text-cyan-100 mt-1 block">
                    {accounts.length} cuentas y billeteras integradas • Toca cualquier cuenta para profundizar
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* All Accounts Itemized (CLICKABLE TO ACCOUNT DEEP DIVE) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Detalle de Saldos por Entidad
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map((acc) => {
                    const pct = totalNetWorth > 0 ? Math.round((acc.currentBalance / totalNetWorth) * 100) : 0;
                    return (
                      <div
                        key={acc.id}
                        onClick={() =>
                          pushStep({
                            id: `acc-${acc.id}`,
                            type: 'account_detail',
                            title: `Cuenta: ${acc.name}`,
                            subtitle: `Saldo actual: ${formatCurrency(acc.currentBalance, settings)}`,
                            accountId: acc.id,
                          })
                        }
                        className="p-4 bg-white dark:bg-slate-800/80 hover:bg-cyan-50/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 rounded-2xl flex items-center justify-between hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform flex-shrink-0"
                            style={{ backgroundColor: acc.color || '#06B6D4' }}
                          >
                            <IconRenderer name={acc.icon || 'CreditCard'} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              {acc.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {(acc.type as string) === 'bank'
                                ? 'Cuenta Bancaria'
                                : (acc.type as string) === 'card'
                                ? 'Tarjeta de Crédito / Débito'
                                : (acc.type as string) === 'cash'
                                ? 'Efectivo'
                                : (acc.type as string) === 'savings'
                                ? 'Ahorros'
                                : (acc.type as string) === 'crypto'
                                ? 'Cripto'
                                : 'Inversión'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <div>
                            <div
                              className={`text-sm font-black ${
                                acc.currentBalance >= 0
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {formatCurrency(acc.currentBalance, settings)}
                            </div>
                            {totalNetWorth > 0 && acc.currentBalance > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">{pct}% del total</span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. CATEGORY DISTRIBUTION DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'category_distribution' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                  Desglose Pormenorizado por Categorías
                </span>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                  Toca cualquier categoría para profundizar en sus movimientos individuales y cuentas asociadas.
                </p>
              </div>

              <div className="space-y-3">
                {categories
                  .filter((c) => c.type === 'expense')
                  .map((cat) => {
                    const catTxs = periodExpenseTxs.filter((t) => t.categoryId === cat.id);
                    const spent = catTxs.reduce((s, t) => s + t.amount, 0);
                    const budget = cat.monthlyBudget || 0;
                    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                    const remaining = budget - spent;

                    return (
                      <div
                        key={cat.id}
                        onClick={() =>
                          pushStep({
                            id: `cat-${cat.id}`,
                            type: 'category_detail',
                            title: `Categoría: ${cat.name}`,
                            subtitle: `${catTxs.length} movimientos • Gasto: ${formatCurrency(spent, settings)}`,
                            categoryId: cat.id,
                          })
                        }
                        className="p-4 bg-white dark:bg-slate-800/80 hover:bg-purple-50/30 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 rounded-2xl space-y-3 cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: cat.color || '#9333EA' }}
                            >
                              <IconRenderer name={cat.icon || 'Layers'} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {cat.name}
                              </h4>
                              <span className="text-[10px] text-slate-400">{catTxs.length} compras / pagos</span>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2 flex-shrink-0">
                            <div>
                              <span className="text-sm font-black text-slate-900 dark:text-white block">
                                {formatCurrency(spent, settings)}
                              </span>
                              {budget > 0 && (
                                <span
                                  className={`text-[10px] font-bold block ${
                                    remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {remaining >= 0
                                    ? `Quedan ${formatCurrency(remaining, settings)}`
                                    : `Excedido por ${formatCurrency(Math.abs(remaining), settings)}`}
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {budget > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>0%</span>
                              <span>Presupuesto: {formatCurrency(budget, settings)}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-purple-600'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. WEEKLY SPENDING DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'weekly_spending' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                  Desglose Diario de la Semana
                </span>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Toca cualquier día para ver sus compras específicas.
                </p>
              </div>

              {/* Day-by-day table */}
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dateStr = d.toISOString().split('T')[0];
                  const dayName = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
                  
                  const dayTxs = transactions.filter((t) => t.date === dateStr && t.type === 'expense');
                  const dayTotal = dayTxs.reduce((s, t) => s + t.amount, 0);

                  return (
                    <div
                      key={dateStr}
                      className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">{dayName}</p>
                        <span className="text-[10px] text-slate-400">{dayTxs.length} movimientos de gasto</span>
                      </div>
                      <span className={`text-xs font-bold ${dayTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {dayTotal > 0 ? `-${formatCurrency(dayTotal, settings)}` : '$0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. HISTORICAL EVOLUTION DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'historical_evolution' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                  Resumen Comparativo Semestral
                </span>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Compara la relación entre ingresos recibidos, gastos ejecutados y el ahorro generado mes a mes.
                </p>
              </div>

              {/* Months Table */}
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - (5 - i));
                  const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const mName = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

                  const mTxs = transactions.filter((t) => t.date.startsWith(mKey));
                  const mIncome = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                  const mExpense = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                  const mSavings = mIncome - mExpense;
                  const mRate = mIncome > 0 ? Math.round((mSavings / mIncome) * 100) : 0;

                  return (
                    <div
                      key={mKey}
                      className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white capitalize">{mName}</h4>
                        <div className="flex items-center gap-3 text-[11px] mt-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            +{formatCurrency(mIncome, settings)}
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            -{formatCurrency(mExpense, settings)}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span
                          className={`text-xs font-black ${
                            mSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Ahorro: {formatCurrency(mSavings, settings)} ({mRate}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 10. TRANSACTION DETAIL & VOUCHER DRILLDOWN */}
          {/* ========================================================================= */}
          {currentStep.type === 'transaction_detail' && currentStep.transaction && (() => {
            const tx = currentStep.transaction;
            const cat = categoryMap.get(tx.categoryId);
            const acc = accountMap.get(tx.accountId);
            const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;

            return (
              <div className="space-y-6">
                {/* Receipt Ticket Box */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-5 relative overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: cat?.color || '#4F46E5' }}
                        title={`Ir a categoría ${cat?.name || 'General'}`}
                        onClick={() =>
                          pushStep({
                            id: `cat-${tx.categoryId}`,
                            type: 'category_detail',
                            title: `Categoría: ${cat?.name || 'General'}`,
                            categoryId: tx.categoryId,
                          })
                        }
                      >
                        <IconRenderer name={cat?.icon || 'DollarSign'} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {tx.description}
                        </h3>
                        <button
                          onClick={() =>
                            pushStep({
                              id: `cat-${tx.categoryId}`,
                              type: 'category_detail',
                              title: `Categoría: ${cat?.name || 'General'}`,
                              categoryId: tx.categoryId,
                            })
                          }
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          {cat?.name || 'General'} →
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-2xl font-black ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}
                        {formatCurrency(tx.amount, settings)}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {tx.type === 'income'
                          ? 'Ingreso'
                          : tx.type === 'transfer'
                          ? 'Transferencia'
                          : 'Gasto'}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatDate(tx.date)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cuenta Origen</span>
                      <button
                        onClick={() =>
                          pushStep({
                            id: `acc-${tx.accountId}`,
                            type: 'account_detail',
                            title: `Cuenta: ${acc?.name || 'Cuenta'}`,
                            accountId: tx.accountId,
                          })
                        }
                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
                      >
                        {acc?.name || 'Cuenta'} →
                      </button>
                    </div>

                    {toAcc && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cuenta Destino</span>
                        <button
                          onClick={() =>
                            pushStep({
                              id: `acc-${tx.toAccountId}`,
                              type: 'account_detail',
                              title: `Cuenta: ${toAcc.name}`,
                              accountId: tx.toAccountId,
                            })
                          }
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
                        >
                          {toAcc.name} →
                        </button>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Origen de Captura</span>
                      <span className="font-bold text-slate-900 dark:text-white capitalize">
                        {tx.source || 'Manual'}
                      </span>
                    </div>

                    {tx.tags && tx.tags.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Etiquetas</span>
                        <div className="flex flex-wrap gap-1">
                          {tx.tags.map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                onClose();
                                onNavigateToTransactions(t);
                              }}
                              className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {tx.notes && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Notas / Detalle</span>
                      <p className="text-slate-700 dark:text-slate-300">{tx.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                    {onEditTransaction && (
                      <button
                        onClick={() => {
                          onEditTransaction(tx);
                          onClose();
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" /> Editar Movimiento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onNavigateToTransactions();
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Todas las Transacciones ({transactions.length}) →
          </button>
          
          <div className="flex items-center gap-2">
            {navStack.length > 1 && (
              <button
                onClick={popStep}
                className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Volver
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-200 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
