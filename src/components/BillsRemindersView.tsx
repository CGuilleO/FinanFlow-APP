import React, { useState } from 'react';
import { Clock, Plus, CheckCircle2, AlertTriangle, Calendar, Bell, Trash2, Edit2, X, Check, CreditCard, Layers, HandCoins, Coins, History } from 'lucide-react';
import { Account, BillReminder, Category, UserSettings, Transaction } from '../types';
import { addBillReminder, deleteBillReminder, formatCurrency, formatDate, updateBillReminder, addTransaction } from '../utils/storage';
import { IconRenderer } from './IconRenderer';
import { LoanPaymentModal } from './Modals/LoanPaymentModal';
import { extractLoanFinancials } from '../utils/loanHelpers';
import confetti from 'canvas-confetti';

interface BillsRemindersViewProps {
  bills: BillReminder[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  transactions?: Transaction[];
  onRefresh: () => void;
}

export const BillsRemindersView: React.FC<BillsRemindersViewProps> = ({
  bills,
  categories,
  accounts,
  settings,
  transactions = [],
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null);

  // Loan Payment Modal state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedLoanBill, setSelectedLoanBill] = useState<BillReminder | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleOpenNew = () => {
    setEditingBill(null);
    setTitle('');
    setAmount(0);
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategoryId(categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '');
    setAccountId(accounts[0]?.id || '');
    setIsRecurring(true);
    setFrequency('monthly');
    setReminderDaysBefore(3);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bill: BillReminder) => {
    setEditingBill(bill);
    setTitle(bill.title);
    setAmount(bill.amount);
    setDueDate(bill.dueDate);
    setCategoryId(bill.categoryId);
    setAccountId(bill.accountId || accounts[0]?.id || '');
    setIsRecurring(bill.isRecurring);
    setFrequency(bill.frequency || 'monthly');
    setReminderDaysBefore(bill.reminderDaysBefore);
    setIsModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    if (editingBill) {
      updateBillReminder(editingBill.id, {
        title: title.trim(),
        amount,
        dueDate,
        categoryId,
        accountId,
        isRecurring,
        frequency,
        reminderDaysBefore,
      });
    } else {
      addBillReminder({
        title: title.trim(),
        amount,
        dueDate,
        categoryId,
        accountId,
        isRecurring,
        frequency,
        reminderDaysBefore,
      });
      confetti({ particleCount: 30, spread: 50 });
    }

    setIsModalOpen(false);
    onRefresh();
  };

  const handleMarkAsPaid = (bill: BillReminder) => {
    // If it's a loan reminder, open the dedicated 3-mode payment modal
    if (bill.isLoanReminder) {
      setSelectedLoanBill(bill);
      setIsLoanModalOpen(true);
      return;
    }

    // 1. Mark regular bill status as paid
    updateBillReminder(bill.id, { status: 'paid' });

    // 2. Automatically record transaction
    addTransaction({
      type: 'expense',
      amount: bill.amount,
      description: `Pago de Factura: ${bill.title}`,
      date: new Date().toISOString().split('T')[0],
      categoryId: bill.categoryId,
      accountId: bill.accountId || accounts[0]?.id || 'acc-1',
      tags: ['factura', 'recurrente', 'servicios'],
      notes: `Pago automático registrado desde Recordatorios de Facturas`,
      source: 'manual',
    });

    confetti({ particleCount: 45, spread: 60 });
    onRefresh();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar el recordatorio de "${name}"?`)) {
      deleteBillReminder(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
            <Bell className="w-3.5 h-3.5" />
            Alarmas & Pagos Futuros
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Recordatorios de Facturas y Suscripciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Evita recargos y mora con avisos automáticos de tus pagos recurrentes
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          Nueva Factura / Recordatorio
        </button>
      </div>

      {/* Bills Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bills.length === 0 ? (
          <div className="col-span-full p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
            <Clock className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No tienes recordatorios de facturas pendientes
            </p>
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl"
            >
              + Agregar tu primera factura
            </button>
          </div>
        ) : (
          bills.map((bill) => {
            const cat = categoryMap.get(bill.categoryId);
            const acc = bill.accountId ? accountMap.get(bill.accountId) : null;
            
            const due = new Date(bill.dueDate);
            due.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

            const isOverdue = diffDays < 0 && bill.status !== 'paid';
            const isDueSoon = diffDays >= 0 && diffDays <= 3 && bill.status !== 'paid';
            const isPaid = bill.status === 'paid';

            return (
              <div
                key={bill.id}
                className={`p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm transition-all space-y-4 ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20'
                    : isDueSoon
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: cat?.color || '#6366F1' }}
                    >
                      <IconRenderer name={cat?.icon || 'Bell'} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        {bill.title}
                        {bill.isLoanReminder && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5">
                            <HandCoins className="w-2.5 h-2.5" /> Préstamo
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {cat?.name || 'Servicios'} {acc ? `• ${acc.name}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(bill)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id, bill.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {bill.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    {bill.notes}
                  </p>
                )}

                {bill.isLoanReminder ? (
                  (() => {
                    const loanFin = extractLoanFinancials(bill, transactions);
                    return (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Capital Pendiente</span>
                            <strong className="text-xs font-black text-slate-900 dark:text-white">
                              {formatCurrency(loanFin.remainingPrincipal, settings)}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-amber-500 block">Interés Cuota</span>
                            <strong className="text-xs font-black text-amber-600 dark:text-amber-400">
                              {formatCurrency(loanFin.interestAmount, settings)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Vencimiento:</span>
                            <strong className="text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDate(bill.dueDate)}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Total a Liquidar:</span>
                            <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(loanFin.remainingPrincipal + loanFin.interestAmount, settings)}
                            </strong>
                          </div>
                        </div>

                        {bill.paymentsHistory && bill.paymentsHistory.length > 0 && (
                          <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                            <History className="w-3 h-3 text-indigo-500" />
                            <span>{bill.paymentsHistory.length} pago(s) registrado(s)</span>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Vencimiento:</span>
                      <strong className="text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(bill.dueDate)}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Importe:</span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount, settings)}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Status Badge & Action */}
                <div className="flex items-center justify-between pt-2">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : isDueSoon
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isPaid
                      ? '✓ Liquidado'
                      : isOverdue
                      ? `¡Vencido hace ${Math.abs(diffDays)} días!`
                      : isDueSoon
                      ? `¡Vence en ${diffDays} día(s)!`
                      : `Programado (${diffDays} días)`}
                  </span>

                  {!isPaid ? (
                    bill.isLoanReminder ? (
                      <button
                        onClick={() => {
                          setSelectedLoanBill(bill);
                          setIsLoanModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Opciones de Pago</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkAsPaid(bill)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" /> Pagar Factura
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Liquidado
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Reminder Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingBill ? 'Editar Factura' : 'Nuevo Recordatorio de Factura'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Concepto / Proveedor *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Alquiler piso, Seguro Zurich, Fibra Movistar..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monto ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {categories.filter((c) => c.type === 'expense').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cuenta de Cargo
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Factura Recurrente
                  </span>
                </label>

                {isRecurring && (
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Avisar con días de anticipación:
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Guardar Recordatorio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Loan Flexible Payment Options Modal */}
      <LoanPaymentModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setSelectedLoanBill(null);
        }}
        bill={selectedLoanBill}
        accounts={accounts}
        settings={settings}
        transactions={transactions}
        onPaymentSuccess={onRefresh}
      />
    </div>
  );
};
