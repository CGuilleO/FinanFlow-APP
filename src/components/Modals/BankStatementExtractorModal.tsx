import React, { useState, useRef, useMemo } from 'react';
import { 
  Building2, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft, 
  X, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Layers, 
  Calendar, 
  Filter, 
  Info,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import { Account, Category, Transaction, UserSettings } from '../../types';
import { addTransaction, addAccount, formatCurrency, formatDate, syncCurrentDataToCloud } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface ExtractedStatementTransaction {
  id: string;
  selected: boolean;
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  balanceAfter?: number | null;
  categoryId: string;
  tags: string[];
  isPotentialDuplicate?: boolean;
  duplicateReason?: string;
}

interface StatementHeader {
  bankName: string;
  accountNumber?: string;
  accountHolder?: string;
  period?: string;
  previousBalance?: number;
  currentBalance?: number;
  totalCredits?: number;
  totalDebits?: number;
}

interface BankStatementExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  existingTransactions: Transaction[];
  settings: UserSettings;
  onSuccess: () => void;
}

export const BankStatementExtractorModal: React.FC<BankStatementExtractorModalProps> = ({
  isOpen,
  onClose,
  categories = [],
  accounts = [],
  existingTransactions = [],
  settings,
  onSuccess,
}) => {
  const safeAccounts = accounts || [];
  const safeCategories = categories || [];
  const safeExistingTxs = existingTransactions || [];

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted Data
  const [statementHeader, setStatementHeader] = useState<StatementHeader | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedStatementTransaction[]>([]);
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize target account when modal opens or accounts change
  React.useEffect(() => {
    if (safeAccounts.length > 0 && !targetAccountId) {
      // Find a default account like Nequi or Bancolombia if exists
      const nequiAcc = safeAccounts.find(a => (a?.name || '').toLowerCase().includes('nequi'));
      setTargetAccountId(nequiAcc ? nequiAcc.id : (safeAccounts[0]?.id || ''));
    }
  }, [safeAccounts, targetAccountId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setFileType(file.type);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFilePreview(base64);
      analyzeStatement(base64, file.type || 'image/png');
    };
    reader.onerror = () => {
      setError('Error al leer el archivo. Por favor intenta nuevamente.');
    };
    reader.readAsDataURL(file);
  };

  const analyzeStatement = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/parse-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType || 'image/png',
          availableCategories: safeCategories.map(c => ({ id: c.id, name: c.name || '', type: c.type })),
          availableAccounts: safeAccounts.map(a => ({ id: a.id, name: a.name || '', type: a.type })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al analizar el extracto con IA');
      }

      const raw = data.data;

      // Check or create matching account (e.g. Nequi)
      let matchedAccId = targetAccountId;
      const detectedBankLower = (raw.bankName || '').toLowerCase();
      const existingMatched = safeAccounts.find(a => 
        (a?.name || '').toLowerCase().includes(detectedBankLower) || 
        (detectedBankLower.includes('nequi') && (a?.name || '').toLowerCase().includes('nequi')) ||
        (detectedBankLower.includes('bancolombia') && (a?.name || '').toLowerCase().includes('bancolombia'))
      );

      if (existingMatched) {
        matchedAccId = existingMatched.id;
        setTargetAccountId(existingMatched.id);
      } else if (raw.bankName) {
        // Automatically create account for convenience if none matches
        const newAcc = addAccount({
          name: raw.bankName.includes('Nequi') ? 'Nequi' : raw.bankName,
          type: 'bank',
          initialBalance: raw.previousBalance || 0,
          currency: settings?.currency || 'COP',
          color: raw.bankName.toLowerCase().includes('nequi') ? '#EC4899' : '#4F46E5',
          icon: 'Smartphone',
          accountNumberMask: raw.accountNumber ? `****${raw.accountNumber.slice(-4)}` : undefined,
        });
        matchedAccId = newAcc.id;
        setTargetAccountId(newAcc.id);
      }

      setStatementHeader({
        bankName: raw.bankName || 'Extracto Bancario',
        accountNumber: raw.accountNumber,
        accountHolder: raw.accountHolder,
        period: raw.period,
        previousBalance: raw.previousBalance,
        currentBalance: raw.currentBalance,
        totalCredits: raw.totalCredits,
        totalDebits: raw.totalDebits,
      });

      // Process and detect potential duplicates against existing transactions
      const processed: ExtractedStatementTransaction[] = (raw.transactions || []).map((t: any, index: number) => {
        // Find suggested category id or fallback
        const catFound = safeCategories.find(
          c => (c?.name || '').toLowerCase() === (t.suggestedCategory || '').toLowerCase()
        ) || safeCategories.find(c => c?.type === (t.type === 'income' ? 'income' : 'expense')) || safeCategories[0];

        // Duplicate check logic: same date and same amount (±1%)
        const tAmount = Math.abs(Number(t.amount) || 0);
        const potentialDup = safeExistingTxs.find(et => {
          const sameDate = et.date === t.date;
          const sameAmount = Math.abs((Number(et.amount) || 0) - tAmount) < 0.05;
          return sameDate && sameAmount;
        });

        return {
          id: `ext-${index}-${Date.now()}`,
          selected: !potentialDup, // Auto-uncheck potential duplicates to protect user
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || 'Movimiento de extracto',
          amount: tAmount,
          type: t.type === 'income' ? 'income' : 'expense',
          balanceAfter: t.balanceAfter,
          categoryId: catFound?.id || safeCategories[0]?.id || '',
          tags: t.suggestedTags || [raw.bankName ? raw.bankName.toLowerCase() : 'extracto'],
          isPotentialDuplicate: !!potentialDup,
          duplicateReason: potentialDup ? `Coincide con "${potentialDup.description || 'Movimiento'}" del ${formatDate(potentialDup.date)}` : undefined,
        };
      });

      setExtractedItems(processed);
    } catch (err: any) {
      console.error('Error parsing statement:', err);
      setError(err.message || 'No se pudo procesar el extracto bancario. Asegúrate de que la imagen sea legible.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setExtractedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setExtractedItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleSelectOnlyNew = () => {
    setExtractedItems(prev =>
      prev.map(item => ({ ...item, selected: !item.isPotentialDuplicate }))
    );
  };

  const handleUpdateItem = (id: string, updates: Partial<ExtractedStatementTransaction>) => {
    setExtractedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const selectedCount = (extractedItems || []).filter(i => i?.selected).length;
  const duplicateCount = (extractedItems || []).filter(i => i?.isPotentialDuplicate).length;

  const filteredItems = useMemo(() => {
    const list = extractedItems || [];
    if (filterType === 'all') return list;
    return list.filter(i => i?.type === filterType);
  }, [extractedItems, filterType]);

  const totalSelectedAmount = useMemo(() => {
    let income = 0;
    let expense = 0;
    (extractedItems || []).forEach(i => {
      if (i?.selected) {
        const amt = Number(i.amount) || 0;
        if (i.type === 'income') income += amt;
        else expense += amt;
      }
    });
    return { income, expense, net: income - expense };
  }, [extractedItems]);

  const handleImportToAccount = async () => {
    const toImport = (extractedItems || []).filter(i => i?.selected);
    if (toImport.length === 0) {
      setError('Por favor selecciona al menos un movimiento para importar.');
      return;
    }

    if (!targetAccountId) {
      setError('Por favor selecciona la cuenta de destino.');
      return;
    }

    // Save each transaction
    for (const item of toImport) {
      addTransaction({
        type: item.type,
        amount: Number(item.amount) || 0,
        description: item.description,
        date: item.date,
        categoryId: item.categoryId,
        accountId: targetAccountId,
        tags: item.tags,
        source: 'ocr',
        notes: `Importado desde extracto bancario ${statementHeader?.bankName || ''}`,
      });
    }

    // Trigger cloud sync
    syncCurrentDataToCloud().catch(console.error);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-pink-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Lector de Extractos Bancarios
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Nequi • Bancolombia • Nu
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sube la foto o PDF de tu extracto. La IA lee todas las filas, evita duplicados y concilia tus saldos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-xs text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Dropzone (When no extracted data yet) */}
          {extractedItems.length === 0 && !isAnalyzing && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Haz clic o arrastra tu extracto bancario aquí
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Admite capturas de pantalla, fotos o archivos PDF de <strong>Nequi, Bancolombia, Daviplata, Nu, BBVA</strong> y otros bancos.
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" /> Seleccionar Imagen o PDF
              </span>
            </div>
          )}

          {/* Analyzing Loading State */}
          {isAnalyzing && (
            <div className="p-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Leyendo extracto bancario con IA...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Extrayendo movimientos, fechas, destinatarios y cotejando con tus registros previos...
                </p>
              </div>
            </div>
          )}

          {/* Results Table & Reconciliation View */}
          {extractedItems.length > 0 && statementHeader && (
            <div className="space-y-4 animate-in fade-in">
              {/* Statement Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {(statementHeader.bankName || 'B').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {statementHeader.bankName || 'Extracto Bancario'}
                      {statementHeader.accountNumber && (
                        <span className="text-xs font-medium text-slate-500">
                          (No. {statementHeader.accountNumber})
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {statementHeader.accountHolder ? `${statementHeader.accountHolder} • ` : ''}
                      {statementHeader.period || 'Extracto Mensual'}
                    </p>
                  </div>
                </div>

                {/* Balance pill stats */}
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {statementHeader.previousBalance !== undefined && (
                    <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block font-semibold">Saldo Anterior</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(statementHeader.previousBalance, settings)}
                      </strong>
                    </div>
                  )}

                  {statementHeader.currentBalance !== undefined && (
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                      <span className="text-[10px] text-indigo-200 block font-semibold">Saldo Final Extracto</span>
                      <strong className="text-white">
                        {formatCurrency(statementHeader.currentBalance, settings)}
                      </strong>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setExtractedItems([]);
                      setStatementHeader(null);
                      setFilePreview(null);
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-white/80 dark:hover:bg-slate-900 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Destination Account Selection & Duplicate Filter Helpers */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Asignar a la Cuenta en la App:
                  </label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    {safeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name || 'Cuenta'} ({formatCurrency(acc.currentBalance ?? acc.initialBalance ?? 0, settings)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Smart duplicate handling helper buttons */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {duplicateCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {duplicateCount} posible(s) duplicado(s) detectado(s)
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSelectOnlyNew}
                    className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold transition-colors"
                  >
                    Solo Nuevos
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                  >
                    Seleccionar Todos ({extractedItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      filterType === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Todos ({extractedItems.length})
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      filterType === 'expense'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Gastos ({extractedItems.filter(i => i.type === 'expense').length})
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      filterType === 'income'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Ingresos ({extractedItems.filter(i => i.type === 'income').length})
                  </button>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                  {selectedCount} seleccionados para importar
                </span>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      item.selected
                        ? 'bg-white dark:bg-slate-800/90 border-indigo-200 dark:border-indigo-800 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
                      />

                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white ${
                        item.type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}>
                        {item.type === 'income' ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            className="text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md"
                          />

                          {item.isPotentialDuplicate && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Posible duplicado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>{formatDate(item.date)}</span>
                          <span>•</span>
                          <select
                            value={item.categoryId}
                            onChange={(e) => handleUpdateItem(item.id, { categoryId: e.target.value })}
                            className="bg-transparent text-indigo-600 dark:text-indigo-400 font-semibold focus:outline-hidden cursor-pointer"
                          >
                            {safeCategories.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name || 'Categoría'}
                              </option>
                            ))}
                          </select>
                          {item.balanceAfter !== undefined && item.balanceAfter !== null && (
                            <>
                              <span>•</span>
                              <span>Saldo tras mov: {formatCurrency(item.balanceAfter, settings)}</span>
                            </>
                          )}
                        </div>

                        {item.duplicateReason && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 italic">
                            ⚠️ {item.duplicateReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black ${
                        item.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount, settings)}
                      </div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        {item.type === 'income' ? 'Abono' : 'Cargo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {extractedItems.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">
                {selectedCount} movimiento(s) seleccionados:
              </span>{' '}
              Ingresos: <strong className="text-emerald-600">+{formatCurrency(totalSelectedAmount.income, settings)}</strong> •{' '}
              Gastos: <strong className="text-rose-600">-{formatCurrency(totalSelectedAmount.expense, settings)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleImportToAccount}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                Importar {selectedCount} Movimientos a la Cuenta
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
