import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  FileText, 
  Calendar, 
  DollarSign, 
  Layers, 
  ArrowRight, 
  ShieldCheck, 
  CheckSquare, 
  Square,
  Clock,
  Building2,
  Receipt,
  Tag,
  Copy,
  ExternalLink,
  Key,
  Check,
  Globe
} from 'lucide-react';
import { Account, BillReminder, Category, Transaction, UserSettings } from '../../types';
import { 
  searchGmailInvoices, 
  analyzeInvoicesWithAI, 
  DetectedInvoiceItem 
} from '../../utils/gmailInvoiceService';
import { 
  signInWithGoogleForGmail, 
  requestGsiAccessToken,
  getCachedGmailAccessToken, 
  setCachedGmailAccessToken,
  signOutGoogle 
} from '../../lib/firebase';
import { addTransaction, addBill, formatCurrency } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface GmailInvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
}

export const GmailInvoiceScannerModal: React.FC<GmailInvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  settings,
  onSuccess,
}) => {
  const [token, setToken] = useState<string | null>(getCachedGmailAccessToken());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'idle' | 'searching' | 'analyzing' | 'done'>('idle');
  const [foundEmailsCount, setFoundEmailsCount] = useState(0);
  const [detectedInvoices, setDetectedInvoices] = useState<DetectedInvoiceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [daysBack, setDaysBack] = useState<number>(30);
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'finanflow.insights.com.co';
  const isUnauthorizedDomain = error?.toLowerCase().includes('unauthorized-domain') || error?.toLowerCase().includes('unauthorized domain');

  useEffect(() => {
    if (isOpen) {
      const activeToken = getCachedGmailAccessToken();
      setToken(activeToken);
      if (activeToken && detectedInvoices.length === 0 && !isScanning) {
        // Auto start scan if already authenticated
        startScan(activeToken);
      }
    } else {
      setError(null);
      setImportedCount(null);
      setShowManualTokenInput(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleGoogleConnect = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const result = await signInWithGoogleForGmail();
      setToken(result.accessToken);
      if (result.email) setUserEmail(result.email);
      // Immediately start scan after successful Google sign in
      await startScan(result.accessToken);
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        setError('Inicio de sesión cancelado o ventana cerrada. Haz clic de nuevo cuando estés listo.');
      } else {
        console.warn('Error in Google Auth:', err?.message || err);
        setError(err.message || 'No se pudo conectar con Gmail.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDirectGsiConnect = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const gsiToken = await requestGsiAccessToken('https://www.googleapis.com/auth/gmail.readonly');
      if (gsiToken) {
        setToken(gsiToken);
        setCachedGmailAccessToken(gsiToken);
        await startScan(gsiToken);
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo autorizar con Google Identity Services.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    const cleanToken = manualToken.trim();
    setToken(cleanToken);
    setCachedGmailAccessToken(cleanToken);
    setError(null);
    setShowManualTokenInput(false);
    startScan(cleanToken);
  };

  const handleLoadDemoInvoices = () => {
    setIsScanning(true);
    setError(null);
    setScanStep('searching');
    setFoundEmailsCount(6);

    setTimeout(() => {
      setScanStep('analyzing');
      setTimeout(() => {
        const today = new Date();
        const formatDate = (daysAgo: number) => {
          const d = new Date();
          d.setDate(today.getDate() - daysAgo);
          return d.toISOString().split('T')[0];
        };

        const demoInvoices: DetectedInvoiceItem[] = [
          {
            id: 'inv_demo_dian_claro',
            merchant: 'Claro Soluciones Móviles y Hogar',
            totalAmount: 145900,
            date: formatDate(3),
            dueDate: formatDate(-10),
            invoiceNumber: 'FE-839210',
            type: 'bill_reminder',
            suggestedCategory: 'Servicios',
            suggestedAccount: accounts[0]?.name || 'Bancolombia Principal',
            confidenceScore: 0.98,
            summary: 'Factura electrónica mensual servicios de internet fibra óptica y telefonía móvil.',
            emailSubject: 'Factura Electrónica de Venta No. FE-839210 - Comunicación Celular Comcel S.A.',
            selected: true,
          },
          {
            id: 'inv_demo_epm',
            merchant: 'EPM Empresas Públicas de Medellín',
            totalAmount: 289450,
            date: formatDate(5),
            dueDate: formatDate(-7),
            invoiceNumber: 'ESP-491024',
            type: 'bill_reminder',
            suggestedCategory: 'Servicios',
            suggestedAccount: accounts[0]?.name || 'Bancolombia Principal',
            confidenceScore: 0.96,
            summary: 'Cuenta de servicios públicos domiciliarios (Energía, Gas y Acueducto).',
            emailSubject: 'Tu factura de servicios públicos EPM ya está lista para pago No. ESP-491024',
            selected: true,
          },
          {
            id: 'inv_demo_rappi',
            merchant: 'Rappi Colombia S.A.S',
            totalAmount: 54900,
            date: formatDate(1),
            invoiceNumber: 'RP-90214',
            type: 'expense',
            suggestedCategory: 'Alimentación',
            suggestedAccount: accounts[1]?.name || accounts[0]?.name || 'Tarjeta de Crédito',
            confidenceScore: 0.94,
            summary: 'Comprobante de compra y entrega de restaurante a domicilio.',
            emailSubject: 'Tu recibo de pedido en Rappi No. RP-90214',
            selected: true,
          },
          {
            id: 'inv_demo_uber',
            merchant: 'Uber B.V. Colombia',
            totalAmount: 23800,
            date: formatDate(2),
            invoiceNumber: 'UB-11029',
            type: 'expense',
            suggestedCategory: 'Transporte',
            suggestedAccount: accounts[0]?.name || 'Nequi',
            confidenceScore: 0.95,
            summary: 'Recibo de viaje corporativo en la ciudad.',
            emailSubject: 'Tu viaje con Uber del martes por la mañana',
            selected: true,
          },
          {
            id: 'inv_demo_enel',
            merchant: 'Enel Colombia S.A. ESP',
            totalAmount: 182300,
            date: formatDate(8),
            dueDate: formatDate(-12),
            invoiceNumber: 'ENL-77189',
            type: 'bill_reminder',
            suggestedCategory: 'Servicios',
            suggestedAccount: accounts[0]?.name || 'Bancolombia',
            confidenceScore: 0.97,
            summary: 'Factura electrónica de servicio de energía eléctrica.',
            emailSubject: 'Factura Electrónica Enel Colombia - Cupón de pago ENL-77189',
            selected: true,
          },
          {
            id: 'inv_demo_banco',
            merchant: 'Bancolombia Notificaciones',
            totalAmount: 350000,
            date: formatDate(4),
            invoiceNumber: 'TRF-55829',
            type: 'expense',
            suggestedCategory: 'Gastos Fijos',
            suggestedAccount: accounts[0]?.name || 'Bancolombia Principal',
            confidenceScore: 0.93,
            summary: 'Comprobante de transferencia bancaria por pago de arriendo / cuota.',
            emailSubject: 'Comprobante de transferencia exitosa Bancolombia No. TRF-55829',
            selected: true,
          }
        ];

        setDetectedInvoices(demoInvoices);
        setToken('demo_token');
        setScanStep('done');
        setIsScanning(false);
      }, 1000);
    }, 800);
  };

  const startScan = async (accessToken: string) => {
    setIsScanning(true);
    setError(null);
    setImportedCount(null);
    setScanStep('searching');

    try {
      // Step 1: Query Gmail API for invoice emails
      const rawMessages = await searchGmailInvoices(accessToken, daysBack);
      setFoundEmailsCount(rawMessages.length);

      if (rawMessages.length === 0) {
        setScanStep('done');
        setDetectedInvoices([]);
        setIsScanning(false);
        return;
      }

      // Step 2: Analyze with Gemini AI
      setScanStep('analyzing');
      const categoryNames = categories.map((c) => c.name);
      const accountNames = accounts.map((a) => a.name);

      const aiResult = await analyzeInvoicesWithAI(rawMessages, categoryNames, accountNames);
      setDetectedInvoices(aiResult.detectedInvoices);
      setScanStep('done');
    } catch (err: any) {
      console.error('Scan error:', err);
      if (err.message && err.message.includes('reautorización')) {
        setToken(null);
      }
      setError(err.message || 'Ocurrió un error al escanear los correos de Gmail.');
      setScanStep('idle');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setDetectedInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, selected: !inv.selected } : inv))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = detectedInvoices.every((i) => i.selected);
    setDetectedInvoices((prev) => prev.map((inv) => ({ ...inv, selected: !allSelected })));
  };

  const updateInvoiceType = (id: string, newType: 'expense' | 'bill_reminder' | 'income') => {
    setDetectedInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, type: newType } : inv))
    );
  };

  const updateInvoiceCategory = (id: string, categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setDetectedInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, suggestedCategory: cat.name } : inv))
      );
    }
  };

  const handleImportSelected = () => {
    const selected = detectedInvoices.filter((inv) => inv.selected);
    if (selected.length === 0) {
      setError('Por favor selecciona al menos una factura para importar.');
      return;
    }

    let count = 0;
    const defaultAccountId = accounts[0]?.id || 'acc_bancolombia';

    selected.forEach((item) => {
      // Match category
      const matchedCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes(item.suggestedCategory.toLowerCase()) ||
          item.suggestedCategory.toLowerCase().includes(c.name.toLowerCase())
      ) || categories[0];

      // Match account
      const matchedAcc = accounts.find(
        (a) =>
          a.name.toLowerCase().includes((item.suggestedAccount || '').toLowerCase()) ||
          (item.suggestedAccount || '').toLowerCase().includes(a.name.toLowerCase())
      ) || accounts[0];

      const accId = matchedAcc?.id || defaultAccountId;
      const catId = matchedCat?.id || (categories[0]?.id || 'cat_services');

      if (item.type === 'bill_reminder') {
        // Add as pending bill
        addBill({
          title: `Factura: ${item.merchant}`,
          amount: item.totalAmount,
          dueDate: item.dueDate || item.date,
          categoryId: catId,
          accountId: accId,
          isRecurring: false,
          reminderDaysBefore: 3,
          notes: `${item.summary} | Factura No: ${item.invoiceNumber || 'S/N'} (Importado de Gmail)`,
        });
      } else {
        // Add as transaction (expense or income)
        addTransaction({
          type: item.type === 'income' ? 'income' : 'expense',
          amount: item.totalAmount,
          description: `${item.merchant} ${item.invoiceNumber ? `(${item.invoiceNumber})` : ''}`.trim(),
          date: item.date,
          categoryId: catId,
          accountId: accId,
          tags: ['factura-electronica', 'gmail-auto', item.merchant.toLowerCase().replace(/\s+/g, '-')],
          notes: `${item.summary} | Correo: ${item.emailSubject || ''}`,
          source: 'invoice',
        });
      }
      count++;
    });

    setImportedCount(count);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    onSuccess();
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const selectedInvoices = detectedInvoices.filter((i) => i.selected);
  const totalSelectedAmount = selectedInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Rastreador de Facturas Gmail
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> IA
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detecta facturas electrónicas, DIAN, recibos de servicios y transferencias bancarias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification and Domain Resolution Helper */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{error}</p>
                {isUnauthorizedDomain && (
                  <p className="mt-1 text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                    Google y Firebase requieren registrar tu dominio personalizado para autorizar inicios de sesión emergentes.
                  </p>
                )}
              </div>
            </div>

            {isUnauthorizedDomain && (
              <div className="pt-2 border-t border-rose-200/70 dark:border-rose-900/60 space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-200/50 dark:border-rose-900/40 text-[11px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono text-slate-700 dark:text-slate-200 truncate">{currentHost}</span>
                  </div>
                  <button
                    onClick={handleCopyDomain}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-[10px] font-bold transition-all"
                  >
                    {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'Copiado' : 'Copiar Dominio'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Pasos rápidos para habilitar en Firebase:</p>
                  <p>1. Entra a Firebase Console &gt; <strong>Authentication</strong> &gt; Pestaña <strong>Settings</strong> &gt; <strong>Authorized Domains</strong>.</p>
                  <p>2. Haz clic en <strong>Add Domain</strong> y pega: <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-rose-600 dark:text-rose-400">{currentHost}</code>.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleDirectGsiConnect}
                    disabled={isAuthenticating}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Conectar vía Google Identity Directo</span>
                  </button>
                  <button
                    onClick={handleLoadDemoInvoices}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Probar Escáner con Facturas Demo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success notification */}
        {importedCount !== null && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-bold">¡{importedCount} Facturas importadas con éxito!</p>
              <p className="text-xs opacity-90">Se han incorporado a tus movimientos y recordatorios de FinanFlow.</p>
            </div>
          </div>
        )}

        {/* Modal Body / Steps */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {!token ? (
            /* STEP 1: Connect Gmail with Google Auth */
            <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Receipt className="w-8 h-8" />
              </div>
              
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Conecta tu cuenta de Gmail
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  FinanFlow buscará de forma segura en tu bandeja de entrada correos con facturas electrónicas (DIAN, Claro, EPM, Enel, Rappi, Uber, bancos, etc.) y extraerá los montos y fechas automáticamente.
                </p>
              </div>

              {/* Official Google Sign-In button */}
              <div className="flex flex-col items-center gap-2.5 w-full max-w-sm">
                <button
                  onClick={handleGoogleConnect}
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg text-slate-700 dark:text-slate-100 font-semibold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Conectando con Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continuar con Google (Gmail)</span>
                    </>
                  )}
                </button>

                {/* Instant alternative: Demo Scan */}
                <button
                  type="button"
                  onClick={handleLoadDemoInvoices}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Probar Escáner IA con Facturas Demo (DIAN / Servicios)</span>
                </button>
              </div>

              {/* Manual token collapsible */}
              <div className="pt-1">
                {!showManualTokenInput ? (
                  <button
                    type="button"
                    onClick={() => setShowManualTokenInput(true)}
                    className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors cursor-pointer"
                  >
                    ¿Deseas ingresar un Access Token manualmente?
                  </button>
                ) : (
                  <form onSubmit={handleManualTokenSubmit} className="w-full max-w-sm space-y-2 mt-2 text-left bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Google OAuth Access Token
                    </label>
                    <input
                      type="text"
                      placeholder="ya29.a0Ac..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowManualTokenInput(false)}
                        className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!manualToken.trim()}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Usar Token
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Acceso de solo lectura protegido por OAuth 2.0</span>
              </div>
            </div>
          ) : isScanning ? (
            /* STEP 2: Scanning & AI Analyzing State */
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 text-white shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {scanStep === 'searching'
                    ? 'Buscando correos de facturas y recibos...'
                    : 'Analizando montos y comercios con IA...'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {scanStep === 'searching'
                    ? `Consultando los últimos ${daysBack} días en tu Gmail...`
                    : `Se encontraron ${foundEmailsCount} correos relevantes. Extrayendo datos fiscales...`}
                </p>
              </div>
            </div>
          ) : detectedInvoices.length === 0 ? (
            /* STEP 3A: No invoices found */
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  No se encontraron facturas recientes
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  No detectamos facturas electrónicas o comprobantes en los últimos {daysBack} días. Puedes ampliar el rango o volver a escanear.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <select
                  value={daysBack}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium"
                >
                  <option value={15}>Últimos 15 días</option>
                  <option value={30}>Últimos 30 días</option>
                  <option value={60}>Últimos 60 días</option>
                  <option value={90}>Últimos 90 días</option>
                </select>
                <button
                  onClick={() => startScan(token)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reintentar Escaneo
                </button>
              </div>
            </div>
          ) : (
            /* STEP 3B: List of Detected Invoices ready for approval */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {detectedInvoices.every((i) => i.selected) ? (
                      <>
                        <CheckSquare className="w-4 h-4" /> Deseleccionar todo
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" /> Seleccionar todo
                      </>
                    )}
                  </button>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {selectedInvoices.length} de {detectedInvoices.length} seleccionadas
                  </span>
                </div>

                <button
                  onClick={() => startScan(token)}
                  className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Re-escanear
                </button>
              </div>

              {/* Invoices List */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {detectedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => toggleSelectInvoice(inv.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      inv.selected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                            inv.selected
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {inv.selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {inv.merchant}
                            </span>
                            {inv.invoiceNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">
                                {inv.invoiceNumber}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.type === 'bill_reminder'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : inv.type === 'income'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {inv.type === 'bill_reminder'
                                ? 'Factura por Pagar'
                                : inv.type === 'income'
                                ? 'Ingreso Recibido'
                                : 'Gasto Pagado'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                            {inv.summary}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-400 flex-wrap pt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {inv.date}
                            </span>
                            {inv.dueDate && inv.type === 'bill_reminder' && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Clock className="w-3 h-3" /> Vence: {inv.dueDate}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" /> {inv.suggestedCategory}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total Amount Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(inv.totalAmount, settings.currency)}
                        </span>
                        {inv.confidenceScore && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {inv.confidenceScore}% certidumbre
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {token && (
              <button
                onClick={() => {
                  signOutGoogle();
                  setToken(null);
                  setDetectedInvoices([]);
                }}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                Desconectar Gmail
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>

            {detectedInvoices.length > 0 && (
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedInvoices.length === 0}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Importar {selectedInvoices.length} Factura{selectedInvoices.length !== 1 ? 's' : ''} ({formatCurrency(totalSelectedAmount, settings.currency)})
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
