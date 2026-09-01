import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Tag, Calendar, Layers, CreditCard, Repeat, ArrowRightLeft, Sparkles, Camera, Mic, MessageSquare } from 'lucide-react';
import { Account, Category, Transaction, TransactionType, UserSettings } from '../../types';
import { addTransaction, formatCurrency, updateTransaction } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
  onOpenOCR?: () => void;
  onOpenVoice?: () => void;
  onOpenSMS?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
  categories,
  accounts,
  settings,
  onSuccess,
  onOpenOCR,
  onOpenVoice,
  onOpenSMS,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount);
      setDescription(transactionToEdit.description);
      setDate(transactionToEdit.date);
      setCategoryId(transactionToEdit.categoryId);
      setAccountId(transactionToEdit.accountId);
      setToAccountId(transactionToEdit.toAccountId || '');
      setTags(transactionToEdit.tags || []);
      setNotes(transactionToEdit.notes || '');
      setIsRecurring(!!transactionToEdit.isRecurring);
      setRecurringFrequency(transactionToEdit.recurringFrequency || 'monthly');
    } else {
      // Default state for new
      setType('expense');
      setAmount(0);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      const defaultCat = categories.find((c) => c.type === 'expense');
      setCategoryId(defaultCat?.id || categories[0]?.id || '');
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setTags([]);
      setNotes('');
      setIsRecurring(false);
    }
    setError(null);
  }, [transactionToEdit, isOpen, categories, accounts]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      const incCat = categories.find((c) => c.type === 'income');
      if (incCat) setCategoryId(incCat.id);
    } else if (newType === 'expense') {
      const expCat = categories.find((c) => c.type === 'expense');
      if (expCat) setCategoryId(expCat.id);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Por favor escribe un concepto o descripción');
      return;
    }
    if (amount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (type === 'transfer' && accountId === toAccountId) {
      setError('La cuenta origen y destino deben ser distintas');
      return;
    }

    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        type,
        amount,
        description: description.trim(),
        date,
        categoryId: type === 'transfer' ? 'cat-transfer' : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        tags,
        notes: notes.trim(),
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
      });
    } else {
      addTransaction({
        type,
        amount,
        description: description.trim(),
        date,
        categoryId: type === 'transfer' ? 'cat-transfer' : categoryId,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        tags,
        notes: notes.trim(),
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        source: 'manual',
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    onSuccess();
    onClose();
  };

  const filteredCategories = categories.filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {transactionToEdit ? 'Editar Movimiento' : 'Añadir Nuevo Movimiento'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registra tus ingresos, gastos o transferencias entre cuentas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Quick Shortcuts Bar (Only on New transaction) */}
        {!transactionToEdit && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Atajos IA:
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {onOpenOCR && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOCR();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Camera className="w-3 h-3" /> Foto Ticket
                </button>
              )}
              {onOpenVoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVoice();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Mic className="w-3 h-3" /> Dictar Voz
                </button>
              )}
              {onOpenSMS && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSMS();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-lg flex items-center gap-1 transition-all"
                >
                  <MessageSquare className="w-3 h-3" /> SMS / Factura
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {/* Type Selector (Gasto / Ingreso / Transferencia) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              - Gasto
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              + Ingreso
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                type === 'transfer'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
            </button>
          </div>

          {/* Amount and Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monto ({settings.currencySymbol}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`w-full px-4 py-2.5 text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:outline-none ${
                    type === 'expense'
                      ? 'text-rose-600 dark:text-rose-400 focus:ring-rose-500'
                      : type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500'
                      : 'text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Descripción *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Supermercado, Alquiler, Salario freelance..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                {type === 'transfer' ? 'Desde Cuenta (Origen)' : 'Cuenta / Tarjeta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance, settings)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  Hacia Cuenta (Destino)
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.currentBalance, settings)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-500" /> Etiquetas (#tags para búsqueda rápida)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Escribe etiqueta y pulsa Enter..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-xl"
              >
                +
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notas adicionales (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre la compra, garantía o referencia..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" /> Movimiento Recurrente
              </span>
            </label>

            {isRecurring && (
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            {transactionToEdit ? 'Guardar Cambios' : 'Registrar Movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
};
