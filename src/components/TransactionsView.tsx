import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Tag, 
  Trash2, 
  Edit, 
  Calendar, 
  Download, 
  Eye, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft, 
  Camera, 
  Layers, 
  CreditCard,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  HandCoins,
  Bell,
  Clock,
  Building2
} from 'lucide-react';
import { Account, Category, Transaction, UserSettings } from '../types';
import { deleteTransaction, formatCurrency, formatDate, clearOnlyTransactions, syncCurrentDataToCloud } from '../utils/storage';
import { IconRenderer } from './IconRenderer';
import { SmartCSVImportModal } from './Modals/SmartCSVImportModal';
import { BankStatementExtractorModal } from './Modals/BankStatementExtractorModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  initialTagFilter?: string;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenExport: () => void;
  onOpenBankStatement?: () => void;
  onRefresh: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  settings,
  initialTagFilter,
  onOpenNewTransaction,
  onEditTransaction,
  onOpenExport,
  onOpenBankStatement,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>(initialTagFilter || 'all');
  const [dateRange, setDateRange] = useState<'all' | 'current-month' | 'last-month' | 'custom'>('current-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSmartImportModalOpen, setIsSmartImportModalOpen] = useState(false);
  const [isBankStatementModalOpen, setIsBankStatementModalOpen] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const handleClearAllTransactions = async () => {
    setIsClearing(true);
    try {
      clearOnlyTransactions(true);
      await syncCurrentDataToCloud();
      setIsConfirmingClear(false);
      onRefresh();
    } catch (e) {
      console.error('Error clearing', e);
    } finally {
      setIsClearing(false);
    }
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      t.tags?.forEach((tag) => set.add(tag.toLowerCase()));
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filter logic
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return transactions.filter((t) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(term);
        const notesMatch = (t.notes || '').toLowerCase().includes(term);
        const tagMatch = t.tags?.some((tg) => tg.toLowerCase().includes(term));
        const catMatch = (categoryMap.get(t.categoryId)?.name || '').toLowerCase().includes(term);
        if (!descMatch && !notesMatch && !tagMatch && !catMatch) return false;
      }

      // Type
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // Category
      if (selectedCategory !== 'all' && t.categoryId !== selectedCategory) return false;

      // Account
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount && t.toAccountId !== selectedAccount) return false;

      // Tag
      if (selectedTag !== 'all' && !t.tags?.includes(selectedTag)) return false;

      // Date Range
      if (dateRange === 'current-month') {
        if (!t.date.startsWith(currentMonthKey)) return false;
      } else if (dateRange === 'last-month') {
        if (!t.date.startsWith(lastMonthKey)) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, selectedType, selectedCategory, selectedAccount, selectedTag, dateRange, customStartDate, customEndDate, categoryMap]);

  // Totals for filtered transactions
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = (id: string, desc: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el movimiento "${desc}"?`)) {
      deleteTransaction(id);
      onRefresh();
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedTag('all');
    setDateRange('all');
  };

  const hasActiveFilters = searchTerm || selectedType !== 'all' || selectedCategory !== 'all' || selectedAccount !== 'all' || selectedTag !== 'all' || dateRange !== 'current-month';

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Historial de Transacciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Filtra, busca por etiquetas, edita o exporta tus movimientos financieros
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (onOpenBankStatement) {
                onOpenBankStatement();
              } else {
                setIsBankStatementModalOpen(true);
              }
            }}
            className="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Subir Extracto (PDF / Foto)</span>
          </button>

          <button
            onClick={() => setIsSmartImportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>

          {transactions.length > 0 && (
            <button
              onClick={() => setIsConfirmingClear(true)}
              title="Borrar movimientos para importar de nuevo"
              className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vaciar</span>
            </button>
          )}

          <button
            onClick={onOpenNewTransaction}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        {/* Row 1: Search & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por concepto, comercio, etiqueta (#tag), notas..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  selectedType === t
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'expense' ? 'Gastos' : t === 'income' ? 'Ingresos' : 'Transf.'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Category, Account, Date Range Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" /> Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'income' ? 'Ingreso' : 'Gasto'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-500" /> Cuenta
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="all">Todas las Cuentas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" /> Periodo
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="current-month">Mes Actual</option>
              <option value="last-month">Mes Anterior</option>
              <option value="all">Todo el Historial</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Desde:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Hasta:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Tags bar */}
        {allTags.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Tag className="w-3 h-3" /> Etiquetas:
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg flex-shrink-0 transition-colors ${
                selectedTag === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                className={`px-2 py-0.5 text-xs font-medium rounded-lg flex-shrink-0 transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Filter Summary & Reset */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-4 font-medium">
            <span>Resultados: <strong>{filteredTransactions.length}</strong></span>
            <span>Ingresos: <strong className="text-emerald-600">+{formatCurrency(filteredIncome, settings)}</strong></span>
            <span>Gastos: <strong className="text-rose-600">-{formatCurrency(filteredExpense, settings)}</strong></span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Filter className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">No se encontraron movimientos con los filtros seleccionados</p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const acc = accountMap.get(tx.accountId);
              const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: cat?.color || '#64748B' }}
                    >
                      <IconRenderer name={cat?.icon || 'DollarSign'} className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tx.description}
                        </h3>
                        {tx.source && tx.source !== 'manual' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5">
                            {tx.source}
                          </span>
                        )}
                        {tx.receiptImage && (
                          <button
                            onClick={() => setPreviewImage(tx.receiptImage || null)}
                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
                          >
                            <Camera className="w-3 h-3" /> Ver Ticket
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span>{cat?.name || 'General'}</span>
                        <span>•</span>
                        <span>{isTransfer ? `${acc?.name} ➔ ${toAcc?.name}` : acc?.name}</span>
                      </div>

                      {tx.notes && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          "{tx.notes}"
                        </p>
                      )}

                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {tx.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTag(tag)}
                              className="text-[10px] font-medium text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Loan Income Breakdown Badge and Values */}
                      {tx.isLoanIncome && tx.loanDetails && (
                        <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1.5 w-full">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                              <HandCoins className="w-3.5 h-3.5" />
                              <span>Préstamo Ingresado</span>
                              {tx.loanDetails.lenderOrBorrower && (
                                <span className="font-normal text-slate-500 text-[11px]">
                                  • {tx.loanDetails.lenderOrBorrower}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span>Vencimiento: <strong>{formatDate(tx.loanDetails.paymentDueDate)}</strong></span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                                <Bell className="w-2.5 h-2.5" /> Aviso 1 día antes
                              </span>
                            </div>
                          </div>

                          {/* Specific values format requested by user: prestado, interes cuota, total a pagar */}
                          <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-indigo-100 dark:border-indigo-900/50">
                            <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Prestado</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {formatCurrency(tx.loanDetails.principalAmount || tx.amount, settings)}
                              </span>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-amber-200/70 dark:border-amber-900/50">
                              <span className="block text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400">Interés Cuota</span>
                              <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                                {formatCurrency(tx.loanDetails.installmentInterestAmount ?? tx.loanDetails.interestAmount, settings)}
                              </span>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-rose-200/70 dark:border-rose-900/50">
                              <span className="block text-[9px] uppercase font-bold text-rose-600 dark:text-rose-400">Total a Pagar</span>
                              <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                                {formatCurrency(tx.loanDetails.totalToPay, settings)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                    <div
                      className={`text-base font-black ${
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        title="Editar movimiento"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id, tx.description)}
                        title="Eliminar movimiento"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Comprobante / Ticket de Compra
            </h3>
            <img
              src={previewImage}
              alt="Comprobante"
              className="max-h-[70vh] w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>
      )}

      {/* Bank Statement Extractor Modal (PDF / Photo) - Fallback if not controlled by parent */}
      {!onOpenBankStatement && (
        <BankStatementExtractorModal
          isOpen={isBankStatementModalOpen}
          onClose={() => setIsBankStatementModalOpen(false)}
          categories={categories}
          accounts={accounts}
          existingTransactions={transactions}
          settings={settings}
          onSuccess={onRefresh}
        />
      )}

      {/* Smart CSV Import Modal */}
      <SmartCSVImportModal
        isOpen={isSmartImportModalOpen}
        onClose={() => setIsSmartImportModalOpen(false)}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onRefresh={onRefresh}
      />

      {/* Quick Wipe Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ¿Vaciar todos los movimientos?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Se eliminarán los <strong>{transactions.length}</strong> movimientos registrados y los saldos se reiniciarán a $0 para que puedas realizar una importación limpia sin duplicados.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearAllTransactions}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Borrando...' : 'Sí, Vaciar Movimientos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
