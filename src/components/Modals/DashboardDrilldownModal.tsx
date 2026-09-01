import React, { useState } from 'react';
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
  Plus,
  Info,
  Clock,
  DollarSign
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

interface DashboardDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DrilldownType | null;
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
  const [selectedCatFilter, setSelectedCatFilter] = useState<string | null>(null);
  const [activeTxDetail, setActiveTxDetail] = useState<Transaction | null>(selectedTransaction || null);

  // Sync selected transaction
  React.useEffect(() => {
    if (selectedTransaction) {
      setActiveTxDetail(selectedTransaction);
    }
  }, [selectedTransaction]);

  if (!isOpen || !type) return null;

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const currentMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthKey));
  const incomeTxs = currentMonthTxs.filter((t) => t.type === 'income');
  const expenseTxs = currentMonthTxs.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const totalNetWorth = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

  const daysPassedInMonth = today.getDate();
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
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
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            {type === 'income' && (
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            )}
            {type === 'expense' && (
              <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            )}
            {type === 'savings' && (
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <PiggyBank className="w-5 h-5" />
              </div>
            )}
            {type === 'net_worth' && (
              <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
                <Wallet className="w-5 h-5" />
              </div>
            )}
            {type === 'category_distribution' && (
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <PieChart className="w-5 h-5" />
              </div>
            )}
            {type === 'weekly_spending' && (
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5" />
              </div>
            )}
            {type === 'historical_evolution' && (
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5" />
              </div>
            )}
            {type === 'transaction_detail' && (
              <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-md">
                <DollarSign className="w-5 h-5" />
              </div>
            )}

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white capitalize">
                {type === 'income' && 'Detalle de Ingresos del Mes'}
                {type === 'expense' && 'Desglose y Análisis de Gastos'}
                {type === 'savings' && 'Diagnóstico de Ahorro y Salud Financiera'}
                {type === 'net_worth' && 'Patrimonio y Distribución de Cuentas'}
                {type === 'category_distribution' && 'Presupuesto y Gastos por Categoría'}
                {type === 'weekly_spending' && 'Ritmo de Gasto de los Últimos 7 Días'}
                {type === 'historical_evolution' && 'Evolución Histórica Semestral'}
                {type === 'transaction_detail' && 'Comprobante y Detalle del Movimiento'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {type === 'transaction_detail' ? 'Información completa del registro' : `Periodo: ${monthName}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {/* ========================================================================= */}
          {/* 1. INCOME DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'income' && (
            <div className="space-y-6">
              {/* Summary Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Total Recibido
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(totalIncome, settings)}
                  </div>
                  <span className="text-xs text-emerald-600/80 mt-1 block">
                    {incomeTxs.length} transacciones registradas
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
                    En {daysPassedInMonth} días transcurridos
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ingreso Mayor
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(
                      incomeTxs.length > 0 ? Math.max(...incomeTxs.map((t) => t.amount)) : 0,
                      settings
                    )}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block truncate">
                    {incomeTxs.length > 0
                      ? incomeTxs.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev)).description
                      : 'Sin ingresos'}
                  </span>
                </div>
              </div>

              {/* Breakdown by Account */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Entradas por Cuenta / Billetera
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map((acc) => {
                    const accIncome = incomeTxs
                      .filter((t) => t.accountId === acc.id)
                      .reduce((s, t) => s + t.amount, 0);
                    if (accIncome === 0) return null;
                    const pct = totalIncome > 0 ? Math.round((accIncome / totalIncome) * 100) : 0;
                    return (
                      <div
                        key={acc.id}
                        className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: acc.color || '#4F46E5' }}
                          >
                            <IconRenderer name={acc.icon || 'CreditCard'} className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{acc.name}</p>
                            <span className="text-[10px] text-slate-400">{pct}% del total mensual</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(accIncome, settings)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Historial de Ingresos ({incomeTxs.length})
                  </h3>
                  <button
                    onClick={onOpenNewTransaction}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo Ingreso
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {incomeTxs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No hay ingresos registrados en este mes todavía.
                    </div>
                  ) : (
                    incomeTxs.map((tx) => {
                      const cat = categoryMap.get(tx.categoryId);
                      const acc = accountMap.get(tx.accountId);
                      return (
                        <div
                          key={tx.id}
                          onClick={() => {
                            setActiveTxDetail(tx);
                          }}
                          className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: cat?.color || '#10B981' }}
                            >
                              <IconRenderer name={cat?.icon || 'DollarSign'} className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{tx.description}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatDate(tx.date)} • {acc?.name || 'Cuenta'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(tx.amount, settings)}
                          </span>
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
          {type === 'expense' && (
            <div className="space-y-6">
              {/* Summary Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                    Total Gastado
                  </span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(totalExpense, settings)}
                  </div>
                  <span className="text-xs text-rose-600/80 mt-1 block">
                    {expenseTxs.length} transacciones registradas
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
                    Proyección fin de mes: {formatCurrency(projectedMonthExpense, settings)}
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

              {/* Top Categories Progress */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Gastos por Categoría
                  </h3>
                  <button
                    onClick={onNavigateToBudgets}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Ajustar Presupuestos →
                  </button>
                </div>

                <div className="space-y-3">
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => {
                      const spent = expenseTxs
                        .filter((t) => t.categoryId === cat.id)
                        .reduce((s, t) => s + t.amount, 0);
                      if (spent === 0 && (!cat.monthlyBudget || cat.monthlyBudget === 0)) return null;
                      const budget = cat.monthlyBudget || 0;
                      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                      const isExceeded = budget > 0 && spent > budget;

                      return (
                        <div
                          key={cat.id}
                          className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs"
                                style={{ backgroundColor: cat.color || '#64748B' }}
                              >
                                <IconRenderer name={cat.icon || 'Tag'} className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
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

              {/* Major Transactions List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Últimos Gastos del Mes ({expenseTxs.length})
                  </h3>
                  <button
                    onClick={() => onNavigateToTransactions()}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Ver Todas →
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {expenseTxs.slice(0, 10).map((tx) => {
                    const cat = categoryMap.get(tx.categoryId);
                    const acc = accountMap.get(tx.accountId);
                    return (
                      <div
                        key={tx.id}
                        onClick={() => setActiveTxDetail(tx)}
                        className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{ backgroundColor: cat?.color || '#EF4444' }}
                          >
                            <IconRenderer name={cat?.icon || 'DollarSign'} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{tx.description}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatDate(tx.date)} • {cat?.name || 'General'} • {acc?.name || 'Cuenta'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                          -{formatCurrency(tx.amount, settings)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. SAVINGS DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'savings' && (
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
                  onClick={onNavigateToAdvisor}
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
                  <span className="text-[10px] text-slate-400">Basado en tus ingresos del mes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      50% Necesidades Básicas
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">
                      {formatCurrency(totalIncome * 0.5, settings)}
                    </span>
                    <span className="text-[10px] text-slate-400">Vivienda, Servicios, Comida</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      30% Deseos & Ocio
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">
                      {formatCurrency(totalIncome * 0.3, settings)}
                    </span>
                    <span className="text-[10px] text-slate-400">Salidas, Suscripciones, Compras</span>
                  </div>

                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">
                      20% Ahorro e Inversión
                    </span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {formatCurrency(totalIncome * 0.2, settings)}
                    </span>
                    <span className="text-[10px] text-indigo-400">Fondo de emergencia / Metas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. NET WORTH & ACCOUNTS DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'net_worth' && (
            <div className="space-y-6">
              {/* Total Net Worth Box */}
              <div className="p-5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 block">
                    Patrimonio Consolidado en Cuentas
                  </span>
                  <div className="text-3xl font-black mt-1">{formatCurrency(totalNetWorth, settings)}</div>
                  <span className="text-xs text-cyan-100 mt-1 block">
                    {accounts.length} cuentas y billeteras integradas
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* All Accounts Itemized */}
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
                        className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: acc.color || '#06B6D4' }}
                          >
                            <IconRenderer name={acc.icon || 'CreditCard'} className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{acc.name}</h4>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {acc.type === 'bank'
                                ? 'Cuenta Bancaria'
                                : acc.type === 'wallet'
                                ? 'Billetera Digital'
                                : acc.type === 'cash'
                                ? 'Efectivo'
                                : acc.type === 'credit'
                                ? 'Tarjeta de Crédito'
                                : 'Inversión'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. CATEGORY DISTRIBUTION DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'category_distribution' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                  Desglose Pormenorizado por Categorías
                </span>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                  Visualiza el consumo exacto de cada rubro respecto a su presupuesto mensual.
                </p>
              </div>

              <div className="space-y-3">
                {categories
                  .filter((c) => c.type === 'expense')
                  .map((cat) => {
                    const catTxs = expenseTxs.filter((t) => t.categoryId === cat.id);
                    const spent = catTxs.reduce((s, t) => s + t.amount, 0);
                    const budget = cat.monthlyBudget || 0;
                    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                    const remaining = budget - spent;

                    return (
                      <div
                        key={cat.id}
                        className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: cat.color || '#9333EA' }}
                            >
                              <IconRenderer name={cat.icon || 'Layers'} className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{cat.name}</h4>
                              <span className="text-[10px] text-slate-400">{catTxs.length} compras / pagos</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
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
          {/* 6. WEEKLY SPENDING DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'weekly_spending' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Desglose Diario de la Semana
                </span>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Revisa los días en los que se concentraron tus mayores compras o retiros.
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
                      className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between"
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
          {/* 7. HISTORICAL EVOLUTION DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'historical_evolution' && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
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
                      className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
          {/* 8. TRANSACTION DETAIL & VOUCHER DRILLDOWN */}
          {/* ========================================================================= */}
          {type === 'transaction_detail' && activeTxDetail && (
            <div className="space-y-6">
              {/* Receipt Ticket Box */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-3xl space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const cat = categoryMap.get(activeTxDetail.categoryId);
                      return (
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                          style={{ backgroundColor: cat?.color || '#4F46E5' }}
                        >
                          <IconRenderer name={cat?.icon || 'DollarSign'} className="w-6 h-6" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {activeTxDetail.description}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {categoryMap.get(activeTxDetail.categoryId)?.name || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-2xl font-black ${
                        activeTxDetail.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : activeTxDetail.type === 'transfer'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {activeTxDetail.type === 'income' ? '+' : activeTxDetail.type === 'transfer' ? '⇄ ' : '-'}
                      {formatCurrency(activeTxDetail.amount, settings)}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {activeTxDetail.type === 'income'
                        ? 'Ingreso'
                        : activeTxDetail.type === 'transfer'
                        ? 'Transferencia'
                        : 'Gasto'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Fecha</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatDate(activeTxDetail.date)}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cuenta Origen</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {accountMap.get(activeTxDetail.accountId)?.name || 'Cuenta'}
                    </span>
                  </div>

                  {activeTxDetail.toAccountId && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cuenta Destino</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {accountMap.get(activeTxDetail.toAccountId)?.name || 'Destino'}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Origen de Captura</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {activeTxDetail.source || 'Manual'}
                    </span>
                  </div>

                  {activeTxDetail.tags && activeTxDetail.tags.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Etiquetas</span>
                      <div className="flex flex-wrap gap-1">
                        {activeTxDetail.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {activeTxDetail.notes && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Notas / Detalle</span>
                    <p className="text-slate-700 dark:text-slate-300">{activeTxDetail.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleDeleteTx(activeTxDetail.id)}
                    className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                  {onEditTransaction && (
                    <button
                      onClick={() => {
                        onEditTransaction(activeTxDetail);
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
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <button
            onClick={() => onNavigateToTransactions()}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Todas las Transacciones →
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
