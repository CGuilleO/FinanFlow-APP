import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  CreditCard, 
  RefreshCw, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Wallet,
  Tags,
  Check
} from 'lucide-react';
import { Account, Category, Transaction, UserSettings } from '../../types';
import { 
  formatCurrency, 
  formatDate,
  getStoredTransactions, 
  getStoredAccounts, 
  getStoredCategories, 
  saveStoredAccounts, 
  saveStoredCategories,
  clearOnlyTransactions,
  clearAllTransactionsAndData,
  applySmartImport, 
  analyzeTransactionDuplicates, 
  syncCurrentDataToCloud,
  recalculateAccountBalances
} from '../../utils/storage';
import { parseCSVTransactions, CSVImportResult } from '../../utils/exportImport';
import confetti from 'canvas-confetti';

interface SmartCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onRefresh: () => void;
}

export const SmartCSVImportModal: React.FC<SmartCSVImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  settings,
  onRefresh,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<CSVImportResult | null>(null);
  const [duplicateSummary, setDuplicateSummary] = useState<{
    totalInFile: number;
    newCount: number;
    duplicateCount: number;
  } | null>(null);
  const [importMode, setImportMode] = useState<'skip-duplicates' | 'replace-all' | 'add-all'>('skip-duplicates');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setIsProcessing(false);
        return;
      }
      parseCSVText(text);
    };
    reader.readAsText(file);
  };

  const parseCSVText = (csvText: string) => {
    try {
      const currentAccounts = getStoredAccounts();
      const currentCategories = getStoredCategories();

      const result = parseCSVTransactions(
        csvText,
        currentCategories,
        currentAccounts,
        settings.currency || 'COP'
      );

      const summary = analyzeTransactionDuplicates(result.parsedTransactions);

      setParsedResult(result);
      setDuplicateSummary(summary);

      if (summary.duplicateCount > 0 && summary.newCount === 0) {
        setImportMode('replace-all');
      } else {
        setImportMode('skip-duplicates');
      }
    } catch (err) {
      console.error('Error parsing CSV:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedResult) return;
    setIsProcessing(true);

    try {
      // 1. Save all discovered accounts and categories
      saveStoredAccounts(parsedResult.discoveredAccounts, false);
      saveStoredCategories(parsedResult.discoveredCategories, false);

      // 2. Apply transactions with chosen deduplication strategy
      const result = applySmartImport(parsedResult.parsedTransactions, importMode);

      // 3. Recalculate account balances
      recalculateAccountBalances();

      // 4. Sync with cloud
      await syncCurrentDataToCloud();

      confetti({ particleCount: 70, spread: 80 });
      setSuccessMessage(
        `¡Importación completada con éxito! Se sincronizaron ${parsedResult.discoveredAccounts.length} cuentas, ${parsedResult.discoveredCategories.length} categorías y ${result.added} movimientos.`
      );

      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1800);
    } catch (e) {
      console.error('Import error', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipeAllData = async () => {
    setIsProcessing(true);
    try {
      clearAllTransactionsAndData();
      await syncCurrentDataToCloud();
      setSuccessMessage('Todos los movimientos y datos han sido borrados limpiamente.');
      setIsConfirmingClear(false);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Wipe error', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-black text-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Importador Inteligente de Movimientos</span>
              </h3>
              <p className="text-xs text-slate-400">AndroMoney, Excel y CSV bancarios con detector anti-duplicados</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1: Upload File if not selected */}
          {!parsedResult ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-3xl p-8 text-center cursor-pointer transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Haz clic para seleccionar tu archivo CSV
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-3">
                  Reconoce automáticamente el formato de AndroMoney, todas tus cuentas, saldos iniciales y categorías.
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                  Seleccionar archivo .csv
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv,.txt" 
                  className="hidden" 
                />
              </div>

              {/* Danger Zone: Wipe Current Data Button */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-300">¿Quieres vaciar todo antes de importar?</p>
                  <p className="text-[11px] text-slate-400">Borra todos los movimientos actuales para empezar de cero sin residuos.</p>
                </div>
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Datos</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Parsed File Preview & Deduplication Choice */
            <div className="space-y-4 animate-in fade-in">
              
              {/* Summary Badges Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-white">Archivo Analizado: {selectedFile?.name || parsedResult.detectedApp}</span>
                  </div>
                  <button 
                    onClick={() => { setParsedResult(null); setSelectedFile(null); }}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Cambiar archivo
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-lg font-black text-white">{parsedResult.validCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">En el CSV</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                    <p className="text-lg font-black text-emerald-400">+{duplicateSummary?.newCount || parsedResult.validCount}</p>
                    <p className="text-[10px] text-emerald-300 uppercase font-bold">Nuevos</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50">
                    <p className="text-lg font-black text-amber-400">{duplicateSummary?.duplicateCount || 0}</p>
                    <p className="text-[10px] text-amber-300 uppercase font-bold">Duplicados</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50">
                    <p className="text-lg font-black text-indigo-400">{parsedResult.discoveredAccounts.length}</p>
                    <p className="text-[10px] text-indigo-300 uppercase font-bold">Cuentas</p>
                  </div>
                </div>

                {/* Discovered Accounts Preview pills */}
                {parsedResult.discoveredAccounts.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                      Cuentas y Tarjetas Detectadas ({parsedResult.discoveredAccounts.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                      {parsedResult.discoveredAccounts.map((acc) => (
                        <span 
                          key={acc.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }}></span>
                          <span className="font-medium">{acc.name}</span>
                          {acc.initialBalance > 0 && (
                            <span className="text-[10px] text-emerald-400 font-mono">
                              (${acc.initialBalance.toLocaleString()})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Categories Preview pills */}
                {parsedResult.discoveredCategories.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Tags className="w-3.5 h-3.5 text-purple-400" />
                      Categorías Detectadas ({parsedResult.discoveredCategories.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                      {parsedResult.discoveredCategories.map((cat) => (
                        <span 
                          key={cat.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                          <span>{cat.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Import Modes selection */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-300">Selecciona cómo deseas aplicar los datos:</p>
                
                {/* Option 1: Skip Duplicates */}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  importMode === 'skip-duplicates' 
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-950/50' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="skip-duplicates"
                    checked={importMode === 'skip-duplicates'}
                    onChange={() => setImportMode('skip-duplicates')}
                    className="mt-1 text-emerald-500 focus:ring-emerald-500" 
                  />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Importación Inteligente (Evitar Duplicados)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Recomendado</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ignora los {duplicateSummary?.duplicateCount || 0} registros que ya existen y añade únicamente los {duplicateSummary?.newCount || parsedResult.validCount} nuevos.
                    </p>
                  </div>
                </label>

                {/* Option 2: Replace All */}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  importMode === 'replace-all' 
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-950/50' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="replace-all"
                    checked={importMode === 'replace-all'}
                    onChange={() => setImportMode('replace-all')}
                    className="mt-1 text-indigo-500 focus:ring-indigo-500" 
                  />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-indigo-400" />
                      Reemplazo Total Limpio (Sobrescribir con este archivo)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Borra los movimientos previos y carga los {parsedResult.validCount} registros de tu archivo creando todas sus cuentas y categorías originales.
                    </p>
                  </div>
                </label>

                {/* Option 3: Add all */}
                <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  importMode === 'add-all' 
                    ? 'bg-slate-800 border-slate-600' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}>
                  <input 
                    type="radio" 
                    name="importMode" 
                    value="add-all"
                    checked={importMode === 'add-all'}
                    onChange={() => setImportMode('add-all')}
                    className="mt-1 text-slate-400 focus:ring-slate-500" 
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-300">
                      Anexar todo (Sin filtro de duplicados)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Agrega todos los {parsedResult.validCount} movimientos al final de tu lista actual.
                    </p>
                  </div>
                </label>
              </div>

            </div>
          )}

          {/* Confirm Clear Modal Dialog */}
          {isConfirmingClear && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-600/60 space-y-3 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>¿Estás seguro de borrar todos los datos?</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Esta acción eliminará todos los registros históricos actuales en este dispositivo y en la nube para que puedas importar tu archivo 100% limpio.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWipeAllData}
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  {isProcessing ? 'Borrando...' : 'Sí, Borrar Todo'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
          >
            Cancelar
          </button>
          
          {parsedResult && (
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing 
                  ? 'Procesando...' 
                  : importMode === 'replace-all' 
                  ? `Reemplazar con ${parsedResult.validCount} movimientos`
                  : `Importar (${importMode === 'skip-duplicates' ? (duplicateSummary?.newCount || parsedResult.validCount) : parsedResult.validCount} registros)`}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
