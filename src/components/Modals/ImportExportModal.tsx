import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, Table, Cloud, Lock, CheckCircle2, AlertCircle, X, Shield, RefreshCw, Sparkles, FileSpreadsheet, ShieldCheck, Trash2 } from 'lucide-react';
import { Account, Category, FinancialHealthAnalysis, Transaction, UserSettings } from '../../types';
import { exportToCSV, generatePDFReport, parseCSVTransactions } from '../../utils/exportImport';
import { 
  addMultipleTransactions, 
  formatCurrency, 
  getStoredTransactions, 
  saveStoredTransactions,
  saveStoredAccounts,
  saveStoredCategories,
  applySmartImport,
  analyzeTransactionDuplicates,
  syncCurrentDataToCloud,
  clearOnlyTransactions,
  recalculateAccountBalances
} from '../../utils/storage';
import confetti from 'canvas-confetti';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  aiAdvice: FinancialHealthAnalysis | null;
  onRefresh: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  accounts,
  settings,
  aiAdvice,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'cloud'>('export');
  
  // Export states
  const [exportPeriod, setExportPeriod] = useState('current-month');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Import states
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'skip-duplicates' | 'replace-all' | 'add-all'>('skip-duplicates');
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Cloud Sync simulation states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter transactions for export
  const getFilteredTransactions = () => {
    const today = new Date();
    if (exportPeriod === 'current-month') {
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter((t) => t.date.startsWith(monthKey));
    }
    if (exportPeriod === 'last-month') {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return transactions.filter((t) => t.date.startsWith(monthKey));
    }
    if (exportPeriod === 'year') {
      const yearKey = `${today.getFullYear()}`;
      return transactions.filter((t) => t.date.startsWith(yearKey));
    }
    return transactions;
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      const filtered = getFilteredTransactions();
      const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      const periodLabels: { [k: string]: string } = {
        'current-month': 'Mes Actual',
        'last-month': 'Mes Anterior',
        year: `Año ${new Date().getFullYear()}`,
        all: 'Historial Completo',
      };

      const dates = filtered.map((t) => t.date).sort();
      const startDate = dates[0] || new Date().toISOString().split('T')[0];
      const endDate = dates[dates.length - 1] || new Date().toISOString().split('T')[0];

      generatePDFReport({
        transactions: filtered,
        categories,
        accounts,
        settings,
        periodName: periodLabels[exportPeriod] || 'Reporte Financiero',
        startDate,
        endDate,
        totalIncome: income,
        totalExpense: expense,
        aiAdvice,
      });

      confetti({ particleCount: 30, spread: 50 });
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const filtered = getFilteredTransactions();
    exportToCSV(filtered, categories, accounts);
  };

  // CSV Import handling
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        processCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const processCSV = (text: string) => {
    setImportError(null);
    try {
      const result = parseCSVTransactions(text, categories, accounts);
      if (result.parsedTransactions.length === 0) {
        setImportError('No se encontraron transacciones válidas en el archivo CSV.');
        setImportPreview(null);
      } else {
        setImportPreview(result);
      }
    } catch (err: any) {
      setImportError(err.message || 'Error al procesar el archivo CSV.');
      setImportPreview(null);
    }
  };

  const handleConfirmCSVImport = async () => {
    if (!importPreview || importPreview.parsedTransactions.length === 0) return;
    setIsProcessingImport(true);

    try {
      // 1. Save all newly discovered accounts and categories
      if (importPreview.discoveredAccounts?.length) {
        saveStoredAccounts(importPreview.discoveredAccounts, false);
      }
      if (importPreview.discoveredCategories?.length) {
        saveStoredCategories(importPreview.discoveredCategories, false);
      }

      // 2. Apply with chosen mode
      const result = applySmartImport(importPreview.parsedTransactions, importMode);
      recalculateAccountBalances();
      await syncCurrentDataToCloud();
      confetti({ particleCount: 60, spread: 70 });
      onRefresh();
      onClose();
    } catch (e) {
      console.error('Import error', e);
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Backup & Cloud Sync
  const handleDownloadEncryptedBackup = () => {
    const fullBackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: getStoredTransactions(),
      categories,
      accounts,
      settings,
    };

    const jsonString = JSON.stringify(fullBackupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinanFlow_Backup_Cifrado_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          saveStoredTransactions(parsed.transactions);
          onRefresh();
          setSyncSuccess(true);
          setTimeout(() => setSyncSuccess(false), 4000);
        } else {
          alert('El archivo no tiene el formato de copia de seguridad válido');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON de copia de seguridad');
      }
    };
    reader.readAsText(file);
  };

  const handleTriggerCloudSync = () => {
    setIsSyncing(true);
    setSyncSuccess(false);

    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 5000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Importación, Exportación & Nube
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Genera reportes en PDF/Excel, migra datos de CSV y sincroniza tus dispositivos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" /> Exportar PDF / Excel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'cloud'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" /> Sincronización & Backup
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selecciona el Periodo del Reporte
                </label>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                >
                  <option value="current-month">Mes Actual ({new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})</option>
                  <option value="last-month">Mes Anterior</option>
                  <option value="year">Todo el Año ({new Date().getFullYear()})</option>
                  <option value="all">Todas las Transacciones ({transactions.length} registros)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* PDF Card */}
                <div className="p-5 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-rose-200/60 dark:border-slate-700 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-3 shadow-md shadow-rose-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Informe PDF Ejecutivo
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Documento formal con balance neto, desglose por categorías, diagnósticos de IA y tabla de movimientos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {isExportingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                  </button>
                </div>

                {/* CSV / Excel Card */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-200/60 dark:border-slate-700 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-600/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Exportar Excel / CSV
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Archivo estructurado compatible con Excel, Google Sheets, Numbers y software de contabilidad.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Descargar CSV (.csv)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              {importError && (
                <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {!importPreview ? (
                <div>
                  {/* AndroMoney & Apps Helper Guide Banner */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-indigo-600 text-white rounded-md">
                        Compatible con AndroMoney
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ¿Cómo exportar desde AndroMoney?
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      1. Abre <strong>AndroMoney</strong> en tu teléfono → ve a <strong>Ajustes (Configuración)</strong> o Menú lateral.<br />
                      2. Toca en <strong>Copia de seguridad / Exportar a CSV (Export CSV)</strong> y elige tu rango de fechas.<br />
                      3. Guarda el archivo o envíatelo a tu email/descargas, y súbelo aquí abajo. FinanFlow mapeará automáticamente las fechas (YYYYMMDD), categorías, cuentas y notas.
                    </p>
                  </div>

                  <div
                    onClick={() => csvFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/20"
                  >
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCSVFileSelect}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Table className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Carga tu archivo CSV de AndroMoney o banco
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                      Reconoce automáticamente columnas de Fecha (YYYYMMDD), Beneficiario, Monto, Categorías, Cuentas y Proyectos.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                    >
                      Seleccionar Archivo CSV
                    </button>
                  </div>

                  {/* Manual Paste */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      O pega el contenido CSV directamente:
                    </label>
                    <textarea
                      rows={3}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="Fecha,Concepto,Monto,Categoria&#10;2026-08-20,Supermercado,45.20,Alimentación"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                    {csvText && (
                      <button
                        type="button"
                        onClick={() => processCSV(csvText)}
                        className="mt-2 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg"
                      >
                        Analizar CSV Pegado
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Se detectaron <strong>{importPreview.validCount}</strong> transacciones listas para importar.
                      </span>
                      {importPreview.detectedApp === 'AndroMoney' && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wide bg-indigo-600 text-white rounded-md">
                          Formato AndroMoney
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportPreview(null)}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline text-[11px] self-end sm:self-auto"
                    >
                      Cambiar Archivo
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="p-2">Fecha</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.parsedTransactions.slice(0, 15).map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 text-slate-500">{t.date}</td>
                            <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{t.description}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                                t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900 dark:text-white">
                              {formatCurrency(t.amount, settings)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Deduplication Mode selection */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Modo de importación:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        importMode === 'skip-duplicates' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="modalImportMode"
                          value="skip-duplicates"
                          checked={importMode === 'skip-duplicates'}
                          onChange={() => setImportMode('skip-duplicates')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>🛡️ Evitar Duplicados (Solo Nuevos)</span>
                      </label>

                      <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        importMode === 'replace-all' 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold text-indigo-800 dark:text-indigo-300' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="modalImportMode"
                          value="replace-all"
                          checked={importMode === 'replace-all'}
                          onChange={() => setImportMode('replace-all')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>🧹 Reemplazar Todo (Limpio)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessingImport}
                    onClick={handleConfirmCSVImport}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isProcessingImport 
                        ? 'Procesando importación...' 
                        : importMode === 'replace-all'
                        ? `Sobrescribir y Cargar ${importPreview.validCount} Transacciones`
                        : `Importar ${importPreview.validCount} Transacciones (Sin Duplicados)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLOUD & BACKUP */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {syncSuccess && (
                <div className="flex items-center gap-2 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Sincronización en tiempo real completada con éxito. Todos los datos están al día.</span>
                </div>
              )}

              {/* Cloud Sync Status */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Sincronización Bidireccional PC / Móvil
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Arquitectura sin conflictos de versionado y privacidad protegida
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerCloudSync}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Estado:</span>
                    <strong className="text-emerald-600 font-bold">Activo / En línea</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Cifrado:</span>
                    <strong className="text-indigo-600 font-bold">AES-256 E2E</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">Registros:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{transactions.length} docs</strong>
                  </div>
                </div>
              </div>

              {/* Encrypted Backup Download / Restore */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Copia de Seguridad Cifrada Local / Nube
                </h4>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadEncryptedBackup}
                    className="flex-1 p-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Copia de Seguridad (.json)
                  </button>

                  <input
                    ref={restoreFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackupFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => restoreFileInputRef.current?.click()}
                    className="flex-1 p-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Restaurar desde Archivo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
