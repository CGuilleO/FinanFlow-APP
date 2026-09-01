import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, CreditCard, DollarSign, AlertTriangle, CheckCircle2, TrendingDown, Sparkles, X, Check, Wallet } from 'lucide-react';
import { Account, AccountType, Category, Transaction, UserSettings } from '../types';
import { addCategory, deleteCategory, formatCurrency, updateCategory, addAccount, updateAccount, deleteAccount } from '../utils/storage';
import { IconRenderer } from './IconRenderer';
import confetti from 'canvas-confetti';

interface BudgetsCategoriesViewProps {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  settings: UserSettings;
  onRefresh: () => void;
}

const AVAILABLE_ICONS = [
  'Utensils', 'Car', 'Home', 'ShoppingBag', 'Tv', 'HeartPulse', 'Briefcase', 'GraduationCap', 'Plane', 'Coffee', 'Gift', 'Smile', 'Zap', 'Shield', 'DollarSign', 'CreditCard'
];

const AVAILABLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#64748B', '#059669', '#D97706'
];

export const BudgetsCategoriesView: React.FC<BudgetsCategoriesViewProps> = ({
  categories,
  accounts,
  transactions,
  settings,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'categories' | 'accounts'>('budgets');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catIcon, setCatIcon] = useState('ShoppingBag');
  const [catColor, setCatColor] = useState('#3B82F6');
  const [catBudget, setCatBudget] = useState<number>(0);

  // Account Modal State
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accBalance, setAccBalance] = useState<number>(0);
  const [accColor, setAccColor] = useState('#3B82F6');

  // Budget calculations for the current month
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthExpenses = transactions.filter((t) => t.date.startsWith(currentMonthKey) && t.type === 'expense');

  const totalMonthlyBudget = categories
    .filter((c) => c.type === 'expense' && (c.monthlyBudget || 0) > 0)
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

  const totalSpentInBudgeted = categories
    .filter((c) => c.type === 'expense' && (c.monthlyBudget || 0) > 0)
    .reduce((sum, c) => {
      const spent = currentMonthExpenses
        .filter((t) => t.categoryId === c.id)
        .reduce((s, t) => s + t.amount, 0);
      return sum + spent;
    }, 0);

  const totalRemaining = Math.max(0, totalMonthlyBudget - totalSpentInBudgeted);
  const overallUsagePct = totalMonthlyBudget > 0 ? Math.round((totalSpentInBudgeted / totalMonthlyBudget) * 100) : 0;

  // Category Modal Handlers
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType('expense');
    setCatIcon('ShoppingBag');
    setCatColor('#3B82F6');
    setCatBudget(0);
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatBudget(cat.monthlyBudget || 0);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: catName.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
        monthlyBudget: catBudget > 0 ? catBudget : undefined,
      });
    } else {
      addCategory({
        name: catName.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
        monthlyBudget: catBudget > 0 ? catBudget : undefined,
      });
      confetti({ particleCount: 30, spread: 50 });
    }

    setIsCatModalOpen(false);
    onRefresh();
  };

  const handleDeleteCat = (id: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar la categoría "${name}"?`)) {
      deleteCategory(id);
      onRefresh();
    }
  };

  // Account Modal Handlers
  const handleOpenNewAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('checking');
    setAccBalance(0);
    setAccColor('#3B82F6');
    setIsAccModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.currentBalance);
    setAccColor(acc.color || '#3B82F6');
    setIsAccModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: accName.trim(),
        type: accType,
        currentBalance: accBalance,
        color: accColor,
      });
    } else {
      addAccount({
        name: accName.trim(),
        type: accType,
        initialBalance: accBalance,
        color: accColor,
        currency: settings.currency,
        icon: 'CreditCard',
      });
      confetti({ particleCount: 30, spread: 50 });
    }

    setIsAccModalOpen(false);
    onRefresh();
  };

  const handleDeleteAcc = (id: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar la cuenta "${name}"?`)) {
      deleteAccount(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Presupuestos, Categorías & Cuentas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Define límites de gasto mensuales y gestiona tus cuentas bancarias
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'accounts' ? (
            <button
              onClick={handleOpenNewAccount}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </button>
          ) : (
            <button
              onClick={handleOpenNewCategory}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('budgets')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'budgets'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Presupuestos Mensuales
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Categorías ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'accounts'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Cuentas ({accounts.length})
        </button>
      </div>

      {/* TAB 1: PRESUPUESTOS */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Global Budget Card */}
          <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-indigo-300">
                  Presupuesto Global ({new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})
                </span>
                <div className="text-2xl sm:text-3xl font-black mt-1">
                  {formatCurrency(totalSpentInBudgeted, settings)} / {formatCurrency(totalMonthlyBudget, settings)}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-indigo-300 block">Disponible Restante:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(totalRemaining, settings)}
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    overallUsagePct >= 100
                      ? 'bg-rose-500'
                      : overallUsagePct >= settings.budgetAlertThreshold
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, overallUsagePct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-indigo-300/80">
                <span>{overallUsagePct}% Consumido</span>
                <span>{100 - Math.min(100, overallUsagePct)}% Restante</span>
              </div>
            </div>
          </div>

          {/* Budget Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              .filter((c) => c.type === 'expense')
              .map((cat) => {
                const spent = currentMonthExpenses
                  .filter((t) => t.categoryId === cat.id)
                  .reduce((sum, t) => sum + t.amount, 0);
                const budget = cat.monthlyBudget || 0;
                const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                const remaining = budget - spent;
                const isOver = spent > budget && budget > 0;

                return (
                  <div
                    key={cat.id}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconRenderer name={cat.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {cat.name}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {budget > 0 ? `Límite: ${formatCurrency(budget, settings)}` : 'Sin presupuesto'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Configurar presupuesto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {budget > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Gastado: {formatCurrency(spent, settings)}
                          </span>
                          <span
                            className={`font-bold ${
                              isOver ? 'text-rose-600' : pct >= settings.budgetAlertThreshold ? 'text-amber-500' : 'text-emerald-600'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isOver ? 'bg-rose-500' : pct >= settings.budgetAlertThreshold ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>
                            {isOver ? (
                              <strong className="text-rose-600">Excedido por {formatCurrency(Math.abs(remaining), settings)}</strong>
                            ) : (
                              <span>Quedan {formatCurrency(remaining, settings)}</span>
                            )}
                          </span>
                          {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Asignar Presupuesto Mensual
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORÍAS */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  <IconRenderer name={cat.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditCategory(cat)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCat(cat.id, cat.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CUENTAS */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: acc.color || '#6366F1' }}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {acc.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 capitalize">
                      {acc.type === 'checking'
                        ? 'Cuenta Corriente'
                        : acc.type === 'credit'
                        ? 'Tarjeta de Crédito'
                        : acc.type === 'cash'
                        ? 'Efectivo'
                        : acc.type === 'savings'
                        ? 'Ahorros'
                        : 'Inversiones'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditAccount(acc)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAcc(acc.id, acc.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldo Actual:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {formatCurrency(acc.currentBalance, settings)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal Form */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej. Gimnasio, Restaurantes..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCatType('expense')}
                  className={`py-1.5 text-xs font-bold rounded-lg border ${
                    catType === 'expense' ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setCatType('income')}
                  className={`py-1.5 text-xs font-bold rounded-lg border ${
                    catType === 'income' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              {catType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Presupuesto Mensual ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={catBudget || ''}
                    onChange={(e) => setCatBudget(parseFloat(e.target.value) || 0)}
                    placeholder="0.00 (opcional)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${catColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Icono</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCatIcon(iconName)}
                      className={`p-2 rounded-xl border flex items-center justify-center ${
                        catIcon === iconName ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <IconRenderer name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal Form */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h3>
              <button onClick={() => setIsAccModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre de la Cuenta</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ej. Santander Nómina, Revolut..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Cuenta</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="checking">Cuenta Bancaria Corriente</option>
                  <option value="savings">Cuenta de Ahorro</option>
                  <option value="credit">Tarjeta de Crédito</option>
                  <option value="cash">Efectivo / Cartera</option>
                  <option value="investment">Inversiones</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Saldo Actual ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={accBalance || ''}
                  onChange={(e) => setAccBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Color Distintivo</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${accColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAccModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
