import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Check, X, Tag, Calendar, Layers, CreditCard, Repeat, ArrowRightLeft,
  Sparkles, Camera, Mic, MessageSquare, HandCoins, Bell, Percent, Info, AlertCircle,
  Upload, FileText, FileCheck, Eye, Trash2, Lightbulb, CheckCircle2, ChevronDown, Download
} from 'lucide-react';
import { Account, Category, Transaction, TransactionType, UserSettings, LoanDetails } from '../../types';
import { addTransaction, formatCurrency, updateTransaction, addBillReminder, updateBillReminder, getStoredTransactions } from '../../utils/storage';
import { isUtilitiesCategory } from '../../utils/constants';
import confetti from 'canvas-confetti';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
  transactions?: Transaction[];
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
  transactions,
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

  // Predictive Category & Tags State
  const [manuallySelectedCategory, setManuallySelectedCategory] = useState<boolean>(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState<boolean>(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utilities Proof / Receipt Upload State (Exclusivo para Servicios: Luz, Agua, Gas, Internet)
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileType, setReceiptFileType] = useState<'pdf' | 'image' | string>('');
  const [receiptFileSize, setReceiptFileSize] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [previewProofModal, setPreviewProofModal] = useState<boolean>(false);

  // Loan Income Sub-State
  const [isLoanIncome, setIsLoanIncome] = useState(false);
  const [interestType, setInterestType] = useState<'percentage' | 'fixed'>('percentage');
  const [interestRate, setInterestRate] = useState<number>(5);
  const [fixedInterestAmount, setFixedInterestAmount] = useState<number>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [paymentDueDate, setPaymentDueDate] = useState<string>(() => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    return nextMonth.toISOString().split('T')[0];
  });
  const [lenderOrBorrower, setLenderOrBorrower] = useState('');

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
      setManuallySelectedCategory(true);

      // Restore proof/receipt if exists
      setReceiptImage(transactionToEdit.receiptImage || '');
      setReceiptFileName(transactionToEdit.receiptFileName || (transactionToEdit.receiptImage ? 'constancia_pago' : ''));
      setReceiptFileType(transactionToEdit.receiptFileType || (transactionToEdit.receiptImage?.includes('application/pdf') ? 'pdf' : 'image'));
      setReceiptFileSize(0);

      if (transactionToEdit.isLoanIncome && transactionToEdit.loanDetails) {
        setIsLoanIncome(true);
        setInterestType(transactionToEdit.loanDetails.interestType || 'percentage');
        setInterestRate(transactionToEdit.loanDetails.interestRate ?? 5);
        setFixedInterestAmount(transactionToEdit.loanDetails.interestAmount || 0);
        setInstallmentsCount(transactionToEdit.loanDetails.installmentsCount || 1);
        setPaymentDueDate(transactionToEdit.loanDetails.paymentDueDate || new Date().toISOString().split('T')[0]);
        setLenderOrBorrower(transactionToEdit.loanDetails.lenderOrBorrower || '');
      } else {
        setIsLoanIncome(false);
        setInterestType('percentage');
        setInterestRate(5);
        setFixedInterestAmount(0);
        setInstallmentsCount(1);
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setPaymentDueDate(nextMonth.toISOString().split('T')[0]);
        setLenderOrBorrower('');
      }
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
      setIsLoanIncome(false);
      setInterestType('percentage');
      setInterestRate(5);
      setFixedInterestAmount(0);
      setInstallmentsCount(1);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setPaymentDueDate(nextMonth.toISOString().split('T')[0]);
      setLenderOrBorrower('');
      setManuallySelectedCategory(false);
      setReceiptImage('');
      setReceiptFileName('');
      setReceiptFileType('');
      setReceiptFileSize(0);
    }
    setError(null);
  }, [transactionToEdit, isOpen, categories, accounts]);

  // Selected Category & Utility Detection
  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);
  const isUtilitiesSelected = useMemo(() => {
    return type === 'expense' && isUtilitiesCategory(selectedCategory);
  }, [type, selectedCategory]);

  // Historical tags used in all transactions (sorted by frequency)
  const historicalTags = useMemo(() => {
    const list = transactions && transactions.length > 0 ? transactions : getStoredTransactions();
    const counts: Record<string, number> = {};
    list.forEach((t) => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          const clean = (tag || '').trim().toLowerCase();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [transactions, isOpen]);

  // Smart Concept / Description Comparison against Categories and Tags
  const conceptPrediction = useMemo(() => {
    const query = description.trim().toLowerCase();
    if (query.length < 2) return null;

    const list = transactions && transactions.length > 0 ? transactions : getStoredTransactions();

    // 1. Check matching past transactions (description / concept matching)
    const matches: { tx: Transaction; score: number }[] = [];
    list.forEach((tx) => {
      const desc = (tx.description || '').trim().toLowerCase();
      if (!desc) return;

      if (desc === query) {
        matches.push({ tx, score: 100 });
      } else if (desc.startsWith(query) || query.startsWith(desc)) {
        matches.push({ tx, score: 85 });
      } else if (desc.includes(query) || query.includes(desc)) {
        matches.push({ tx, score: 70 });
      } else {
        const queryTokens = query.split(/\s+/).filter((w) => w.length >= 3);
        const descTokens = desc.split(/\s+/).filter((w) => w.length >= 3);
        const common = queryTokens.filter((qt) => descTokens.some((dt) => dt.includes(qt) || qt.includes(dt)));
        if (common.length > 0) {
          matches.push({ tx, score: 45 * common.length });
        }
      }
    });

    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      const bestTx = matches[0].tx;
      const targetCategory = categories.find((c) => c.id === bestTx.categoryId);

      const matchedTagsSet = new Set<string>();
      matches.slice(0, 5).forEach((m) => {
        (m.tx.tags || []).forEach((t) => {
          if (t && t.trim()) matchedTagsSet.add(t.trim().toLowerCase());
        });
      });

      return {
        categoryId: bestTx.categoryId,
        category: targetCategory,
        categoryName: targetCategory?.name || 'Categoría coincidente',
        tags: Array.from(matchedTagsSet),
        confidence: matches[0].score >= 70 ? ('high' as const) : ('medium' as const),
        reason: `Coincide con tu historial ("${bestTx.description}")`,
      };
    }

    // 2. Keyword check for Utilities: Luz, Agua, Gas, Internet, etc.
    const utilityKeywords = [
      'luz', 'agua', 'gas', 'internet', 'epm', 'enel', 'codensa', 'vanti',
      'claro', 'tigo', 'movistar', 'etb', 'acueducto', 'energia', 'energía',
      'alcantarillado', 'aseo', 'recibo servicio', 'factura servicio', 'fibra optica'
    ];
    if (utilityKeywords.some((kw) => query.includes(kw))) {
      const utilCat = categories.find((c) => isUtilitiesCategory(c));
      if (utilCat) {
        const suggested: string[] = ['servicios'];
        if (query.includes('luz') || query.includes('enel') || query.includes('codensa') || query.includes('energia')) {
          suggested.push('luz', 'energia');
        }
        if (query.includes('agua') || query.includes('acueducto')) {
          suggested.push('agua');
        }
        if (query.includes('gas') || query.includes('vanti')) {
          suggested.push('gas');
        }
        if (query.includes('internet') || query.includes('claro') || query.includes('tigo') || query.includes('movistar') || query.includes('etb') || query.includes('fibra')) {
          suggested.push('internet');
        }

        return {
          categoryId: utilCat.id,
          category: utilCat,
          categoryName: utilCat.name,
          tags: Array.from(new Set(suggested)),
          confidence: 'high' as const,
          reason: 'Servicio público detectado (Luz, Agua, Gas o Internet)',
        };
      }
    }

    // 3. Fallback: match category names
    for (const cat of categories) {
      const catName = cat.name.toLowerCase();
      if (catName.includes(query) || query.includes(catName)) {
        return {
          categoryId: cat.id,
          category: cat,
          categoryName: cat.name,
          tags: [cat.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')].filter(Boolean),
          confidence: 'medium' as const,
          reason: `Coincide con "${cat.name}"`,
        };
      }
    }

    return null;
  }, [description, transactions, categories]);

  // Automatically update category when user is typing description and hasn't manually selected another category
  useEffect(() => {
    if (!transactionToEdit && !manuallySelectedCategory && conceptPrediction && conceptPrediction.confidence === 'high') {
      if (conceptPrediction.categoryId && conceptPrediction.categoryId !== categoryId) {
        setCategoryId(conceptPrediction.categoryId);
      }
    }
  }, [conceptPrediction, manuallySelectedCategory, transactionToEdit, categoryId]);

  // Apply suggestion manually (category + merged tags)
  const handleApplyPrediction = () => {
    if (!conceptPrediction) return;
    if (conceptPrediction.categoryId) {
      setCategoryId(conceptPrediction.categoryId);
      setManuallySelectedCategory(true);
    }
    if (conceptPrediction.tags && conceptPrediction.tags.length > 0) {
      const merged = Array.from(new Set([...tags, ...conceptPrediction.tags]));
      setTags(merged);
    }
  };

  // Predictive tag suggestions based on tagInput
  const matchingPredictiveTags = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return historicalTags.filter((t) => (!q || t.includes(q)) && !tags.includes(t));
  }, [historicalTags, tagInput, tags]);

  // Proof / Receipt file handler (only for utilities)
  const handleFileUpload = (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe exceder 10MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      setError('Formato no soportado. Sube una imagen (JPG, PNG, WEBP) o un documento PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImage(result);
      setReceiptFileName(file.name);
      setReceiptFileType(isPdf ? 'pdf' : 'image');
      setReceiptFileSize(file.size);
      setError(null);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo. Intenta de nuevo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptImage('');
    setReceiptFileName('');
    setReceiptFileType('');
    setReceiptFileSize(0);
  };

  // Real-time calculations for loan breakdown
  const calculatedInterestAmount = useMemo(() => {
    if (interestType === 'percentage') {
      return Math.round(((amount * (interestRate || 0)) / 100) * 100) / 100;
    }
    return Number(fixedInterestAmount || 0);
  }, [amount, interestRate, interestType, fixedInterestAmount]);

  const totalToPay = useMemo(() => {
    return Math.round((amount + calculatedInterestAmount) * 100) / 100;
  }, [amount, calculatedInterestAmount]);

  const installments = Math.max(1, installmentsCount || 1);

  const installmentAmount = useMemo(() => {
    return Math.round((totalToPay / installments) * 100) / 100;
  }, [totalToPay, installments]);

  const installmentInterestAmount = useMemo(() => {
    return Math.round((calculatedInterestAmount / installments) * 100) / 100;
  }, [calculatedInterestAmount, installments]);

  // Notification date formatted (1 day before payment date)
  const reminderNotificationDate = useMemo(() => {
    if (!paymentDueDate) return '';
    try {
      const d = new Date(paymentDueDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }, [paymentDueDate]);

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

  const handleAddTag = (customTag?: string) => {
    const toAdd = (customTag || tagInput).trim().toLowerCase();
    if (toAdd && !tags.includes(toAdd)) {
      setTags([...tags, toAdd]);
      setTagInput('');
      setIsTagDropdownOpen(false);
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

    // Special handling for Loan Income
    if (type === 'income' && isLoanIncome) {
      if (!paymentDueDate) {
        setError('Por favor selecciona la fecha de pago del préstamo');
        return;
      }

      const loanDetails: LoanDetails = {
        principalAmount: amount,
        interestRate: interestType === 'percentage' ? interestRate : (amount > 0 ? (calculatedInterestAmount / amount) * 100 : 0),
        interestType,
        interestAmount: calculatedInterestAmount,
        installmentInterestAmount,
        installmentAmount,
        installmentsCount: installments,
        totalToPay,
        paymentDueDate,
        reminderDaysBefore: 1, // Notificación activada 1 día antes
        lenderOrBorrower: lenderOrBorrower.trim() || undefined,
        isPaid: false,
      };

      if (transactionToEdit) {
        const billId = transactionToEdit.loanDetails?.linkedBillReminderId;
        if (billId) {
          updateBillReminder(billId, {
            title: `Pago Préstamo: ${description.trim()}`,
            amount: installments > 1 ? installmentAmount : totalToPay,
            dueDate: paymentDueDate,
            reminderDaysBefore: 1,
            notes: `Alerta automática 1 día antes. Prestado: ${formatCurrency(amount, settings)} • Interés cuota: ${formatCurrency(installmentInterestAmount, settings)} • Total a pagar: ${formatCurrency(totalToPay, settings)}`,
          });
          loanDetails.linkedBillReminderId = billId;
        } else {
          const newBill = addBillReminder({
            title: `Pago Préstamo: ${description.trim()}`,
            amount: installments > 1 ? installmentAmount : totalToPay,
            dueDate: paymentDueDate,
            categoryId: 'cat-loan-pay',
            accountId,
            isRecurring: installments > 1,
            frequency: 'monthly',
            reminderDaysBefore: 1,
            notes: `Alerta automática 1 día antes. Prestado: ${formatCurrency(amount, settings)} • Interés cuota: ${formatCurrency(installmentInterestAmount, settings)} • Total a pagar: ${formatCurrency(totalToPay, settings)}`,
            isLoanReminder: true,
            loanTransactionId: transactionToEdit.id,
          });
          loanDetails.linkedBillReminderId = newBill.id;
        }

        updateTransaction(transactionToEdit.id, {
          type: 'income',
          amount,
          description: description.trim(),
          date,
          categoryId: categoryId || 'cat-loan-inc',
          accountId,
          tags: tags.includes('prestamo') ? tags : [...tags, 'prestamo'],
          notes: notes.trim(),
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          isLoanIncome: true,
          loanDetails,
        });
      } else {
        const newBill = addBillReminder({
          title: `Pago Préstamo: ${description.trim()}`,
          amount: installments > 1 ? installmentAmount : totalToPay,
          dueDate: paymentDueDate,
          categoryId: 'cat-loan-pay',
          accountId,
          isRecurring: installments > 1,
          frequency: 'monthly',
          reminderDaysBefore: 1,
          notes: `Alerta automática 1 día antes. Prestado: ${formatCurrency(amount, settings)} • Interés cuota: ${formatCurrency(installmentInterestAmount, settings)} • Total a pagar: ${formatCurrency(totalToPay, settings)}`,
          isLoanReminder: true,
        });

        loanDetails.linkedBillReminderId = newBill.id;

        const newTx = addTransaction({
          type: 'income',
          amount,
          description: description.trim(),
          date,
          categoryId: categoryId || 'cat-loan-inc',
          accountId,
          tags: tags.includes('prestamo') ? tags : [...tags, 'prestamo'],
          notes: notes.trim(),
          isRecurring,
          recurringFrequency: isRecurring ? recurringFrequency : undefined,
          source: 'manual',
          isLoanIncome: true,
          loanDetails,
        });

        updateBillReminder(newBill.id, {
          loanTransactionId: newTx.id,
        });
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
      });

      onSuccess();
      onClose();
      return;
    }

    const receiptPayload = (isUtilitiesSelected && receiptImage) ? {
      receiptImage,
      receiptFileName: receiptFileName || 'constancia_pago.pdf',
      receiptFileType: receiptFileType || 'image',
    } : {
      receiptImage: undefined,
      receiptFileName: undefined,
      receiptFileType: undefined,
    };

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
        isLoanIncome: false,
        ...receiptPayload,
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
        isLoanIncome: false,
        ...receiptPayload,
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Concepto / Descripción *</span>
                {conceptPrediction && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-comparación inteligente activa
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. EPM Luz y Gas, Supermercado, Alquiler, Salario..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
              />

              {/* Predictive comparison with categories and previous tags */}
              {conceptPrediction && (
                <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Sugerencia inteligente:
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {conceptPrediction.reason}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">Categoría:</span>
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                        {conceptPrediction.categoryName}
                      </span>

                      {conceptPrediction.tags.length > 0 && (
                        <>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 ml-1">Etiquetas:</span>
                          {conceptPrediction.tags.map((tg) => (
                            <span
                              key={tg}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700"
                            >
                              #{tg}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyPrediction}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Aplicar sugerencia
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loan Income Option (Special for Ingresos) */}
          {type === 'income' && (
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 dark:from-indigo-950/40 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <HandCoins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      ¿Es un ingreso por Préstamo?
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Calcula intereses, cuotas y activa aviso 1 día antes
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isLoanIncome}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsLoanIncome(checked);
                      if (checked) {
                        const loanCat = categories.find(
                          (c) => c.id === 'cat-loan-inc' || c.name.toLowerCase().includes('préstamo') || c.name.toLowerCase().includes('prestamo')
                        );
                        if (loanCat) setCategoryId(loanCat.id);
                        if (!description) setDescription('Préstamo Recibido');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isLoanIncome && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 space-y-3 animate-in fade-in">
                  {/* Interest and Installments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Percent className="w-3 h-3 text-indigo-500" /> Interés Cobrado
                        </label>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setInterestType('percentage')}
                            className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${
                              interestType === 'percentage'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-500'
                            }`}
                          >
                            % Tasa
                          </button>
                          <button
                            type="button"
                            onClick={() => setInterestType('fixed')}
                            className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${
                              interestType === 'fixed'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-500'
                            }`}
                          >
                            {settings.currencySymbol} Fijo
                          </button>
                        </div>
                      </div>

                      {interestType === 'percentage' ? (
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={interestRate || ''}
                            onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                            placeholder="Ej. 5"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fixedInterestAmount || ''}
                          onChange={(e) => setFixedInterestAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Número de Cuotas
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Payment Due Date & Lender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" /> Fecha de Pago / Vencimiento *
                      </label>
                      <input
                        type="date"
                        required={isLoanIncome}
                        value={paymentDueDate}
                        onChange={(e) => setPaymentDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Prestamista o Entidad (Opcional)
                      </label>
                      <input
                        type="text"
                        value={lenderOrBorrower}
                        onChange={(e) => setLenderOrBorrower(e.target.value)}
                        placeholder="Ej. Banco, Familiar, Cooperativa..."
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Visual Values Breakdown: Prestado, Interés Cuota, Total a Pagar */}
                  <div className="p-3 bg-white/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Resumen y Valores del Préstamo
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {/* 1. Prestado */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Prestado</span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate">
                          {formatCurrency(amount, settings)}
                        </strong>
                      </div>

                      {/* 2. Interés cuota */}
                      <div className="p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">
                          Interés Cuota
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300 block truncate">
                          {formatCurrency(installmentInterestAmount, settings)}
                        </strong>
                        {installments > 1 && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            Cuota: {formatCurrency(installmentAmount, settings)}
                          </span>
                        )}
                      </div>

                      {/* 3. Total a pagar */}
                      <div className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                        <span className="block text-[10px] text-rose-600 dark:text-rose-400 uppercase font-semibold">
                          Total a Pagar
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 block truncate">
                          {formatCurrency(totalToPay, settings)}
                        </strong>
                      </div>
                    </div>

                    {/* Automatic notification 1 day before alert info */}
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-[11px] text-indigo-900 dark:text-indigo-200">
                      <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-semibold leading-tight">
                          Notificación activada 1 día antes:
                        </p>
                        <p className="text-[10px] opacity-90 mt-0.5">
                          Te avisaremos el <strong>{reminderNotificationDate || '1 día antes del vencimiento'}</strong> para recordarte realizar el pago a tiempo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {type !== 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setManuallySelectedCategory(true);
                  }}
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

          {/* Conditional Proof of Payment Upload: ONLY for Services (Luz, Agua, Gas, Internet) */}
          {isUtilitiesSelected && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-50/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Constancia de Pago de Servicios
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                        Luz • Agua • Gas • Internet
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sube la factura cancelada o comprobante del pago efectuado
                    </p>
                  </div>
                </div>
              </div>

              {receiptImage ? (
                /* Uploaded proof preview card */
                <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {receiptFileType === 'pdf' || receiptImage.startsWith('data:application/pdf') ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img src={receiptImage} alt="Constancia" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                        {receiptFileName || 'constancia_servicio'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="uppercase font-semibold text-amber-600 dark:text-amber-400">
                          {receiptFileType === 'pdf' ? 'Documento PDF' : 'Imagen'}
                        </span>
                        {receiptFileSize > 0 && (
                          <>
                            <span>•</span>
                            <span>{Math.round(receiptFileSize / 1024)} KB</span>
                          </>
                        )}
                        <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Adjuntado
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewProofModal(true)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Ver constancia"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar constancia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Dropzone / Upload area */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-amber-500 bg-amber-100/50 dark:bg-amber-950/50'
                      : 'border-amber-300/80 dark:border-amber-800/80 hover:bg-amber-100/30 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Haz clic para subir la constancia o arrastra el archivo aquí
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Archivos soportados: Factura PDF, Recibo JPG, PNG (Hasta 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags with Predictive Selection and Previously Used Cloud */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Etiquetas (#tags)
              </span>
              <span className="text-[10px] font-normal text-slate-400">
                Predictivas basadas en tu historial
              </span>
            </label>

            {/* Input with Predictive Autocomplete Dropdown */}
            <div className="relative">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setIsTagDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (matchingPredictiveTags.length > 0 && tagInput.trim()) {
                          handleAddTag(matchingPredictiveTags[0]);
                        } else {
                          handleAddTag();
                        }
                      } else if (e.key === 'Escape') {
                        setIsTagDropdownOpen(false);
                      }
                    }}
                    placeholder="Escribe o busca una etiqueta usada..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  {tagInput && (
                    <button
                      type="button"
                      onClick={() => setTagInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
                >
                  + Añadir
                </button>
              </div>

              {/* Predictive autocomplete dropdown */}
              {isTagDropdownOpen && matchingPredictiveTags.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto animate-in fade-in">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                    Etiquetas predictivas de tu historial
                  </div>
                  {matchingPredictiveTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1 font-medium">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        #{t}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-semibold">
                        Seleccionar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currently Selected Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-indigo-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Concept-suggested tags (if not already picked) */}
            {conceptPrediction && conceptPrediction.tags.some((t) => !tags.includes(t)) && (
              <div className="p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Sugeridas para este concepto:
                </span>
                <div className="flex flex-wrap gap-1">
                  {conceptPrediction.tags
                    .filter((t) => !tags.includes(t))
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        className="px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        + #{t}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Previously Used Tags Cloud (Clickable to pick) */}
            {historicalTags.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Escoger etiquetas ya usadas:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {historicalTags.slice(0, 15).map((t) => {
                    const isSelected = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveTag(t);
                          } else {
                            handleAddTag(t);
                          }
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>#{t}</span>
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </button>
                    );
                  })}
                </div>
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

      {/* Proof Preview Modal */}
      {previewProofModal && receiptImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                  {receiptFileName || 'Constancia de Pago de Servicios'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {receiptFileType === 'pdf' || receiptImage.startsWith('data:application/pdf') ? (
              <div className="space-y-3">
                <iframe
                  src={receiptImage}
                  className="w-full h-80 rounded-xl border border-slate-200 dark:border-slate-700"
                  title="Constancia PDF"
                />
                <div className="flex justify-end">
                  <a
                    href={receiptImage}
                    download={receiptFileName || 'constancia_servicio.pdf'}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <img
                  src={receiptImage}
                  alt="Constancia de pago"
                  className="max-h-[60vh] w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700"
                />
                <div className="flex justify-end">
                  <a
                    href={receiptImage}
                    download={receiptFileName || 'constancia_servicio.jpg'}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar Imagen
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
