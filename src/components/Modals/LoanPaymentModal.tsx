import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Coins,
  Percent,
  Calendar,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
  TrendingDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BillReminder, Account, UserSettings, Transaction } from '../../types';
import { formatCurrency, formatDate, addTransaction, updateBillReminder, updateTransaction } from '../../utils/storage';
import { extractLoanFinancials, calculateNextDueDate } from '../../utils/loanHelpers';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillReminder | null;
  accounts: Account[];
  settings: UserSettings;
  transactions: Transaction[];
  onPaymentSuccess: () => void;
}

type PaymentMode = 'full' | 'principal' | 'interest';

export const LoanPaymentModal: React.FC<LoanPaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  accounts,
  settings,
  transactions,
  onPaymentSuccess,
}) => {
  const [mode, setMode] = useState<PaymentMode>('full');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Mode: Principal
  const [principalAmountToPay, setPrincipalAmountToPay] = useState<number>(0);
  const [includeInterestWithPrincipal, setIncludeInterestWithPrincipal] = useState<boolean>(true);

  // Mode: Interest
  const [customInterestAmount, setCustomInterestAmount] = useState<number>(0);
  const [nextDueDate, setNextDueDate] = useState<string>('');

  // Mode: Full
  const [customFullAmount, setCustomFullAmount] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Extract financial metrics
  const loanData = useMemo(() => {
    if (!bill) {
      return {
        principalAmount: 0,
        interestAmount: 0,
        totalToPay: 0,
        remainingPrincipal: 0,
        originalNotes: '',
      };
    }
    return extractLoanFinancials(bill, transactions);
  }, [bill, transactions]);

  // Initialize values when bill changes or modal opens
  useEffect(() => {
    if (bill && isOpen) {
      setError(null);
      setSelectedAccountId(bill.accountId || accounts[0]?.id || '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentNotes('');

      const fin = extractLoanFinancials(bill, transactions);
      const remaining = fin.remainingPrincipal;
      const interest = fin.interestAmount;

      setCustomFullAmount(remaining + interest);
      setPrincipalAmountToPay(Math.round(remaining / 2) || remaining);
      setIncludeInterestWithPrincipal(true);
      setCustomInterestAmount(interest);

      const calculatedNext = calculateNextDueDate(bill.dueDate, 1);
      setNextDueDate(calculatedNext);
    }
  }, [bill, isOpen, accounts, transactions]);

  if (!isOpen || !bill) return null;

  const currentPrincipal = loanData.remainingPrincipal;
  const currentInterest = loanData.interestAmount;
  const cleanTitle = bill.title.replace(/^Pago Préstamo:\s*/i, '').trim();

  // Dynamic preview calculations
  let totalDebitAmount = 0;
  let previewRemainingPrincipal = currentPrincipal;
  let previewNextDueDate = bill.dueDate;

  if (mode === 'full') {
    totalDebitAmount = customFullAmount;
    previewRemainingPrincipal = 0;
  } else if (mode === 'principal') {
    const pPay = Math.max(0, principalAmountToPay);
    totalDebitAmount = pPay + (includeInterestWithPrincipal ? currentInterest : 0);
    previewRemainingPrincipal = Math.max(0, currentPrincipal - pPay);
    previewNextDueDate = includeInterestWithPrincipal ? nextDueDate : bill.dueDate;
  } else if (mode === 'interest') {
    totalDebitAmount = Math.max(0, customInterestAmount);
    previewRemainingPrincipal = currentPrincipal; // principal stays intact
    previewNextDueDate = nextDueDate;
  }

  const handleQuickPercent = (pct: number) => {
    const val = Math.round((currentPrincipal * pct) / 100);
    setPrincipalAmountToPay(val);
  };

  const handleQuickAdd = (addVal: number) => {
    setPrincipalAmountToPay((prev) => Math.min(currentPrincipal, prev + addVal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAccountId) {
      setError('Por favor selecciona la cuenta de donde saldrá el dinero');
      return;
    }

    if (totalDebitAmount <= 0) {
      setError('El monto total del pago debe ser mayor a 0');
      return;
    }

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAccount) {
      setError('Cuenta no encontrada');
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const existingHistory = bill.paymentsHistory || [];

      if (mode === 'full') {
        // 1. Full Liquidation
        const tx = addTransaction({
          type: 'expense',
          amount: totalDebitAmount,
          description: `Liquidación Total Préstamo: ${cleanTitle}`,
          date: paymentDate,
          categoryId: bill.categoryId || 'cat-loan-pay',
          accountId: selectedAccountId,
          tags: ['prestamo', 'pago-total', 'deuda', 'liquidacion'],
          notes: paymentNotes.trim()
            ? paymentNotes.trim()
            : `Liquidación total del préstamo "${cleanTitle}". Capital cancelado: ${formatCurrency(currentPrincipal, settings)} + Intereses: ${formatCurrency(currentInterest, settings)}`,
          source: 'manual',
        });

        const newPaymentRecord = {
          id: 'pay-' + Date.now(),
          date: paymentDate,
          type: 'full' as const,
          amount: totalDebitAmount,
          principalPaid: currentPrincipal,
          interestPaid: currentInterest,
          remainingPrincipalAfter: 0,
          transactionId: tx.id,
          note: paymentNotes.trim() || 'Liquidación total',
        };

        // Mark bill as fully paid
        updateBillReminder(bill.id, {
          status: 'paid',
          remainingPrincipal: 0,
          paidPrincipalTotal: (bill.paidPrincipalTotal || 0) + currentPrincipal,
          paidInterestTotal: (bill.paidInterestTotal || 0) + currentInterest,
          notes: `¡Préstamo liquidado totalmente! Total pagado: ${formatCurrency(totalDebitAmount, settings)} el ${formatDate(paymentDate)}`,
          paymentsHistory: [...existingHistory, newPaymentRecord],
        });

        // If linked to an income loan transaction, mark loan isPaid
        if (bill.loanTransactionId) {
          const linkedTx = transactions.find((t) => t.id === bill.loanTransactionId);
          if (linkedTx?.loanDetails) {
            updateTransaction(bill.loanTransactionId, {
              loanDetails: {
                ...linkedTx.loanDetails,
                isPaid: true,
              },
            });
          }
        }
      } else if (mode === 'principal') {
        // 2. Abono a Capital
        const principalPaid = Math.min(currentPrincipal, principalAmountToPay);
        const interestPaid = includeInterestWithPrincipal ? currentInterest : 0;
        const newPrincipal = Math.max(0, currentPrincipal - principalPaid);

        const txDesc = includeInterestWithPrincipal
          ? `Abono a Capital + Interés: ${cleanTitle}`
          : `Abono a Capital: ${cleanTitle}`;

        const tx = addTransaction({
          type: 'expense',
          amount: totalDebitAmount,
          description: txDesc,
          date: paymentDate,
          categoryId: bill.categoryId || 'cat-loan-pay',
          accountId: selectedAccountId,
          tags: ['prestamo', 'abono-capital', 'deuda'],
          notes: `Abono a capital de ${formatCurrency(principalPaid, settings)}${interestPaid > 0 ? ` + pago de intereses de ${formatCurrency(interestPaid, settings)}` : ''}. Capital restante: ${formatCurrency(newPrincipal, settings)}. ${paymentNotes.trim()}`,
          source: 'manual',
        });

        const newPaymentRecord = {
          id: 'pay-' + Date.now(),
          date: paymentDate,
          type: 'principal' as const,
          amount: totalDebitAmount,
          principalPaid,
          interestPaid,
          remainingPrincipalAfter: newPrincipal,
          transactionId: tx.id,
          note: paymentNotes.trim() || `Abono a capital (${formatCurrency(principalPaid, settings)})`,
        };

        // Calculate new periodic interest if percentage
        let newPeriodicInterest = currentInterest;
        if (loanData.interestRate && loanData.interestRate > 0) {
          newPeriodicInterest = Math.round((newPrincipal * loanData.interestRate) / 100);
        }

        const isFullyCleared = newPrincipal <= 0;

        updateBillReminder(bill.id, {
          status: isFullyCleared ? 'paid' : 'pending',
          remainingPrincipal: newPrincipal,
          interestAmount: newPeriodicInterest,
          amount: isFullyCleared ? 0 : newPrincipal + newPeriodicInterest,
          dueDate: includeInterestWithPrincipal && !isFullyCleared ? nextDueDate : bill.dueDate,
          paidPrincipalTotal: (bill.paidPrincipalTotal || 0) + principalPaid,
          paidInterestTotal: (bill.paidInterestTotal || 0) + interestPaid,
          notes: isFullyCleared
            ? `¡Préstamo liquidado totalmente! Último abono: ${formatCurrency(principalPaid, settings)}`
            : `Capital inicial: ${formatCurrency(loanData.principalAmount, settings)} • Abonos realizados: ${formatCurrency((bill.paidPrincipalTotal || 0) + principalPaid, settings)} • Capital pendiente: ${formatCurrency(newPrincipal, settings)} • Interés cuota: ${formatCurrency(newPeriodicInterest, settings)}`,
          paymentsHistory: [...existingHistory, newPaymentRecord],
        });
      } else if (mode === 'interest') {
        // 3. Pagar Solo Interés
        const interestPaid = customInterestAmount;

        const tx = addTransaction({
          type: 'expense',
          amount: interestPaid,
          description: `Pago de Interés Préstamo: ${cleanTitle}`,
          date: paymentDate,
          categoryId: bill.categoryId || 'cat-loan-pay',
          accountId: selectedAccountId,
          tags: ['prestamo', 'pago-interes', 'intereses'],
          notes: `Pago de intereses cuota por ${formatCurrency(interestPaid, settings)}. El capital continúa intacto en ${formatCurrency(currentPrincipal, settings)}. Próximo vencimiento: ${formatDate(nextDueDate)}. ${paymentNotes.trim()}`,
          source: 'manual',
        });

        const newPaymentRecord = {
          id: 'pay-' + Date.now(),
          date: paymentDate,
          type: 'interest' as const,
          amount: interestPaid,
          principalPaid: 0,
          interestPaid,
          remainingPrincipalAfter: currentPrincipal,
          transactionId: tx.id,
          note: paymentNotes.trim() || `Pago de cuota de intereses (${formatCurrency(interestPaid, settings)})`,
        };

        const newTotalInterestPaid = (bill.paidInterestTotal || 0) + interestPaid;

        updateBillReminder(bill.id, {
          status: 'pending', // Keeps loan active
          dueDate: nextDueDate, // Rolls forward to next period
          remainingPrincipal: currentPrincipal,
          paidInterestTotal: newTotalInterestPaid,
          notes: `Capital adeudado: ${formatCurrency(currentPrincipal, settings)} • Interés cuota: ${formatCurrency(interestPaid, settings)} • Total acumulado pagado en intereses: ${formatCurrency(newTotalInterestPaid, settings)} • Próximo vencimiento: ${formatDate(nextDueDate)}`,
          paymentsHistory: [...existingHistory, newPaymentRecord],
        });
      }

      confetti({ particleCount: 60, spread: 70 });
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording loan payment:', err);
      setError('Error al registrar el pago: ' + (err?.message || 'Intente nuevamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-1">
              <Coins className="w-3 h-3" />
              Gestor de Pagos de Préstamo
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              {cleanTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Loan Balance Badges */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3.5 sm:px-6 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800">
          <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Capital Pendiente</span>
            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {formatCurrency(currentPrincipal, settings)}
            </span>
          </div>

          <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-amber-500 block">Interés Cuota</span>
            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(currentInterest, settings)}
            </span>
          </div>

          <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-indigo-500 block">Total Liquidar</span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
              {formatCurrency(currentPrincipal + currentInterest, settings)}
            </span>
          </div>
        </div>

        {/* 3 Payment Mode Buttons */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              Selecciona cómo deseas pagar:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Pagar Totalidad */}
              <button
                type="button"
                onClick={() => setMode('full')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  mode === 'full'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${mode === 'full' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <strong className="text-xs font-black">Pagar Totalidad</strong>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Cancela todo el préstamo y liquida la deuda por completo.
                </p>
                <div className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(currentPrincipal + currentInterest, settings)}
                </div>
              </button>

              {/* Option 2: Abonar a Capital */}
              <button
                type="button"
                onClick={() => setMode('principal')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  mode === 'principal'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${mode === 'principal' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <strong className="text-xs font-black">Abonar a Capital</strong>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Baja el capital adeudado para reducir futuras cuotas e intereses.
                </p>
                <div className="mt-2 text-xs font-black text-blue-600 dark:text-blue-400">
                  Monto flexible
                </div>
              </button>

              {/* Option 3: Pagar Solo Interés */}
              <button
                type="button"
                onClick={() => setMode('interest')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  mode === 'interest'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${mode === 'interest' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Percent className="w-4 h-4" />
                  </div>
                  <strong className="text-xs font-black">Pagar Solo Interés</strong>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Paga la cuota de intereses del mes y renueva el vencimiento.
                </p>
                <div className="mt-2 text-xs font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(currentInterest, settings)}
                </div>
              </button>
            </div>
          </div>

          {/* Mode Configuration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* MODE 1: Pagar Totalidad Details */}
            {mode === 'full' && (
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
                  <span>Capital a cancelar:</span>
                  <strong>{formatCurrency(currentPrincipal, settings)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
                  <span>Intereses de cuota:</span>
                  <strong>{formatCurrency(currentInterest, settings)}</strong>
                </div>
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Total liquidación definitiva:
                  </span>
                  <div className="text-right">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={customFullAmount || ''}
                      onChange={(e) => setCustomFullAmount(parseFloat(e.target.value) || 0)}
                      className="w-36 text-right px-2.5 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Al pagar este importe, el préstamo quedará con saldo $0 y pasará a estado Liquidado.
                </p>
              </div>
            )}

            {/* MODE 2: Abonar a Capital Details */}
            {mode === 'principal' && (
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      ¿Cuánto deseas abonar al capital?
                    </label>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300">
                      Máximo: {formatCurrency(currentPrincipal, settings)}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max={currentPrincipal}
                      step="any"
                      value={principalAmountToPay || ''}
                      onChange={(e) => setPrincipalAmountToPay(parseFloat(e.target.value) || 0)}
                      placeholder="Ej. 100000"
                      className="w-full pl-7 pr-3 py-2 text-sm font-black bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Quick percentage shortcuts */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 mr-1">Rápido:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(25)}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
                    >
                      25% ({formatCurrency(currentPrincipal * 0.25, settings)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(50)}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
                    >
                      50% ({formatCurrency(currentPrincipal * 0.5, settings)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPercent(100)}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
                    >
                      100% (Todo el capital)
                    </button>
                  </div>
                </div>

                {/* Include Interest Checkbox */}
                <div className="p-3 bg-white/70 dark:bg-slate-900/70 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInterestWithPrincipal}
                      onChange={(e) => setIncludeInterestWithPrincipal(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Incluir también la cuota de intereses de este mes (+{formatCurrency(currentInterest, settings)})
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {includeInterestWithPrincipal
                          ? 'Pagas tu interés mensual y adelantas el próximo vencimiento a la siguiente cuota.'
                          : 'Pagas exclusivamente abono a capital extraordinario sin pagar el interés del mes.'}
                      </p>
                    </div>
                  </label>

                  {includeInterestWithPrincipal && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        Próximo vencimiento tras este pago:
                      </span>
                      <input
                        type="date"
                        value={nextDueDate}
                        onChange={(e) => setNextDueDate(e.target.value)}
                        className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* Dynamic Balance Preview */}
                <div className="p-3 rounded-xl bg-blue-100/60 dark:bg-blue-900/30 flex items-center justify-between text-xs text-blue-950 dark:text-blue-200">
                  <div>
                    <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase">
                      Nuevo Capital Pendiente:
                    </span>
                    <strong className="text-sm font-black">
                      {formatCurrency(previewRemainingPrincipal, settings)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase">
                      Total a Debitar Hoy:
                    </span>
                    <strong className="text-sm font-black text-blue-700 dark:text-blue-400">
                      {formatCurrency(totalDebitAmount, settings)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: Pagar Solo Interés Details */}
            {mode === 'interest' && (
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Monto de Interés de la cuota:
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={customInterestAmount || ''}
                      onChange={(e) => setCustomInterestAmount(parseFloat(e.target.value) || 0)}
                      className="w-36 pl-6 pr-2 py-1 text-right text-xs font-black bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-700 dark:text-amber-300"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
                  <div>
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                      Próxima Fecha de Vencimiento:
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">
                      (Se extiende automáticamente al siguiente mes)
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="p-3 bg-amber-100/60 dark:bg-amber-900/30 rounded-xl text-xs space-y-1 text-amber-950 dark:text-amber-200">
                  <div className="flex items-center justify-between">
                    <span>Capital adeudado (intacto):</span>
                    <strong>{formatCurrency(currentPrincipal, settings)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total a debitar de tu cuenta:</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(totalDebitAmount, settings)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Account & Date Selection (Common for all modes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cuenta de salida (pago) *
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, settings)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de pago realizada *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nota adicional (opcional)
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ej. Transferencia Nequi #84920, comprobante enviado..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting || totalDebitAmount <= 0}
                className={`px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                  mode === 'full'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : mode === 'principal'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                {isSubmitting ? (
                  <span>Registrando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {mode === 'full'
                        ? `Confirmar Liquidación (${formatCurrency(totalDebitAmount, settings)})`
                        : mode === 'principal'
                        ? `Confirmar Abono (${formatCurrency(totalDebitAmount, settings)})`
                        : `Confirmar Pago de Interés (${formatCurrency(totalDebitAmount, settings)})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Previous payment history if any */}
          {bill.paymentsHistory && bill.paymentsHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Historial de pagos registrados en este préstamo:
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {bill.paymentsHistory.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {h.type === 'full'
                          ? 'Liquidación Total'
                          : h.type === 'principal'
                          ? 'Abono a Capital'
                          : 'Pago de Interés'}
                      </span>
                      <span className="text-slate-400 ml-1.5">• {formatDate(h.date)}</span>
                      {h.remainingPrincipalAfter !== undefined && (
                        <span className="text-[10px] text-slate-500 block">
                          Capital restante posterior: {formatCurrency(h.remainingPrincipalAfter, settings)}
                        </span>
                      )}
                    </div>
                    <strong className="text-xs text-slate-900 dark:text-white">
                      {formatCurrency(h.amount, settings)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
