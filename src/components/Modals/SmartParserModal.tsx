import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Building,
  Mail,
  CheckCircle2,
  Copy,
  Zap,
  Smartphone,
  Radio,
  Send,
  HelpCircle,
  RefreshCw,
  Share2,
  Wallet,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { Account, Category, UserSettings } from '../../types';
import { addMultipleTransactions, formatCurrency } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface SmartParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
  initialText?: string;
}

const WALLET_TEMPLATES = [
  {
    name: 'Nequi (Transferencia)',
    bank: 'Nequi',
    type: 'wallet',
    text: '¡Listo! Enviaste $45.000 a Juan Pérez (3101234567). Referencia: M192834. Saldo disponible: $320.000.',
  },
  {
    name: 'Daviplata (Pago/Transferencia)',
    bank: 'Daviplata',
    type: 'wallet',
    text: 'DaviPlata: Has transferido $75.000 a la cuenta 481029102. Nro de Aprobación 849201. Fecha: 31/08/2026.',
  },
  {
    name: 'Mercado Pago (Compra/QR)',
    bank: 'Mercado Pago',
    type: 'wallet',
    text: 'Mercado Pago: Pagaste $34.500 en Farmacia San Pablo con dinero en cuenta. Operación #781920318.',
  },
  {
    name: 'RappiPay / Ualá',
    bank: 'RappiPay',
    type: 'wallet',
    text: 'RappiPay: Compra aprobada por $24.900 en Restaurante Wok con tarjeta débito virtual terminada en 8912.',
  },
  {
    name: 'Bancolombia SMS',
    bank: 'Bancolombia',
    type: 'bank',
    text: 'Bancolombia le informa compra por $68.900 en SUPERMERCADO EXITO con su tarjeta debito *4912 el 31/08/2026 15:42.',
  },
  {
    name: 'BBVA / Santander SMS',
    bank: 'BBVA / Santander',
    type: 'bank',
    text: 'BBVA: Cargo aprobado por 42.50 EUR en GASOLINERA REPSOL con tarjeta terminacion *4301 el 31-Ago-2026.',
  },
  {
    name: 'Bizum / Transfiya (Envío)',
    bank: 'Bizum',
    type: 'wallet',
    text: 'Has enviado un Bizum de 35,00 EUR a Laura Martín. Concepto: Regalo cumpleaños. Saldo: 1.450,00 EUR.',
  },
  {
    name: 'Factura Electrónica (Email)',
    bank: 'Factura',
    type: 'invoice',
    text: 'Factura Simplificada Vodafone Espana S.A.\nFecha Emision: 2026-08-20\nConcepto: Fibra Optica 600MB + Linea Movil\nTotal Factura a Pagar: 50.00 €\nForma de pago: Domiciliacion Bancaria BBVA',
  },
];

export const SmartParserModal: React.FC<SmartParserModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  settings,
  onSuccess,
  initialText = '',
}) => {
  const [activeTab, setActiveTab] = useState<'parser' | 'wallets_guide' | 'auto_hub'>('parser');
  const [inputText, setInputText] = useState(initialText);
  const [sourceType, setSourceType] = useState<'sms' | 'wallet' | 'invoice'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Live Simulator state
  const [simText, setSimText] = useState('Nequi: Enviaste $65.000 a Restaurante El Buen Sabor con referencia M94820.');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  const [extractedTransactions, setExtractedTransactions] = useState<Array<{
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    accountId: string;
    tags: string[];
    notes: string;
    selected: boolean;
  }>>([]);

  // Auto-parse on mount or when initialText changes (e.g. from Web Share Target or Clipboard detector)
  useEffect(() => {
    if (initialText && initialText.trim()) {
      setInputText(initialText);
      parseTextWithAI(initialText);
    }
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/webhook/auto-ingest`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const parseTextWithAI = async (textToParse: string) => {
    if (!textToParse.trim()) {
      setError('Por favor pega el texto del comprobante, SMS o factura');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setExtractedTransactions([]);

    try {
      const availableCatNames = categories.map((c) => c.name);
      const availableAccNames = accounts.map((a) => a.name);

      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToParse,
          sourceType,
          availableCategories: availableCatNames,
          availableAccounts: availableAccNames,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error procesando el comprobante');
      }

      const json = await res.json();
      const rawTxs = json.data?.transactions || [];

      if (rawTxs.length === 0) {
        throw new Error('No se detectaron datos de transacción claros. Puedes ajustar el texto o crearlo manualmente.');
      }

      const formatted = rawTxs.map((item: any) => {
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes((item.suggestedCategory || '').toLowerCase()) ||
          (item.suggestedCategory || '').toLowerCase().includes(c.name.toLowerCase())
        ) || (item.type === 'income' ? categories.find(c => c.type === 'income') : categories.find(c => c.type === 'expense')) || categories[0];

        const matchedAcc = accounts.find((a) =>
          a.name.toLowerCase().includes((item.suggestedAccount || '').toLowerCase()) ||
          (item.suggestedAccount || '').toLowerCase().includes(a.name.toLowerCase())
        ) || accounts[0];

        return {
          type: item.type === 'income' ? 'income' : item.type === 'transfer' ? 'transfer' : 'expense',
          amount: Math.abs(item.amount || 0),
          description: item.description || 'Movimiento de Billetera',
          date: item.date || new Date().toISOString().split('T')[0],
          categoryId: matchedCat.id,
          accountId: matchedAcc.id,
          tags: item.tags || [sourceType, 'billetera-digital', 'ia'],
          notes: item.notes || `Detectado desde ${sourceType.toUpperCase()}`,
          selected: true,
        };
      });

      setExtractedTransactions(formatted);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar el mensaje con IA');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySample = (sampleText: string) => {
    setInputText(sampleText);
    parseTextWithAI(sampleText);
  };

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError('Pega el texto directamente con Ctrl+V o manteniendo presionado.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputText(text);
        parseTextWithAI(text);
      } else {
        setError('El portapapeles está vacío.');
      }
    } catch {
      setError('Permiso denegado para leer portapapeles. Pega el texto manualmente.');
    }
  };

  const handleRunSimulator = async () => {
    if (!simText.trim()) return;
    setSimLoading(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/webhook/auto-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simText }),
      });

      if (!res.ok) throw new Error('Error al ejecutar webhook simulado');
      const json = await res.json();
      setSimResult(json);

      if (json.transaction) {
        const item = json.transaction;
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes((item.category || '').toLowerCase())
        ) || categories[0];

        const matchedAcc = accounts.find((a) =>
          a.name.toLowerCase().includes((item.account || '').toLowerCase())
        ) || accounts[0];

        addMultipleTransactions([
          {
            type: item.type as any,
            amount: item.amount,
            description: item.description,
            date: item.date,
            categoryId: matchedCat.id,
            accountId: matchedAcc.id,
            tags: item.tags,
            notes: item.notes,
            source: 'sms',
          },
        ]);

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });

        onSuccess();
      }
    } catch (err: any) {
      alert(err.message || 'Error en el simulador');
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveSelected = () => {
    const toSave = extractedTransactions.filter((t) => t.selected);
    if (toSave.length === 0) {
      setError('Selecciona al menos un movimiento para guardar');
      return;
    }

    addMultipleTransactions(
      toSave.map((t) => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        date: t.date,
        categoryId: t.categoryId,
        accountId: t.accountId,
        tags: t.tags,
        notes: t.notes,
        source: 'sms',
      }))
    );

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Billeteras Digitales, SMS & Facturas
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-full">
                  GEMINI AI
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Captura instantánea desde Nequi, Daviplata, Mercado Pago, bancos y facturas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="flex items-center px-4 pt-2.5 pb-2 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('parser')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'parser'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Pegado & Auto-IA</span>
          </button>

          <button
            onClick={() => setActiveTab('wallets_guide')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'wallets_guide'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-500" />
            <span>Compartir desde Billeteras (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('auto_hub')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'auto_hub'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>Segundo Plano (Webhook)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* TAB 1: PARSER & QUICK CLIPBOARD */}
          {activeTab === 'parser' && (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Source Mode Buttons & Quick Paste */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('wallet')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                      sourceType === 'wallet'
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Billetera Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('sms')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                      sourceType === 'sms'
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> SMS Bancario
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('invoice')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                      sourceType === 'invoice'
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Factura / Email
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="py-1.5 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Pegar Comprobante Copiado</span>
                </button>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Pega el texto del comprobante, SMS o correo:</span>
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Limpiar
                    </button>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ej: Nequi: Enviaste $45.000 a Juan Pérez..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Process Button */}
              <button
                type="button"
                disabled={isProcessing || !inputText.trim()}
                onClick={() => parseTextWithAI(inputText)}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Extrayendo con Gemini AI...' : 'Procesar Comprobante con IA'}
              </button>

              {/* Templates Grid */}
              {extractedTransactions.length === 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    O prueba con comprobantes de billeteras y bancos reales:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WALLET_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySample(tmpl.text)}
                        className="text-left p-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-indigo-600">
                          <span className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                            {tmpl.name}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2">{tmpl.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Review */}
              {extractedTransactions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Comprobante Interpretado ({extractedTransactions.length})
                    </span>
                    <span className="text-[11px] text-slate-400">Verificado por Gemini AI</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {extractedTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all ${
                          tx.selected
                            ? 'bg-slate-50 dark:bg-slate-800/70 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tx.selected}
                              onChange={(e) => {
                                const updated = [...extractedTransactions];
                                updated[idx].selected = e.target.checked;
                                setExtractedTransactions(updated);
                              }}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {tx.description}
                            </span>
                          </label>
                          <span className={`text-sm font-black ${
                            tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, settings)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <div>
                            <span className="block text-[10px] text-slate-400">Fecha</span>
                            <strong className="text-slate-700 dark:text-slate-300">{tx.date}</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Categoría</span>
                            <strong className="text-slate-700 dark:text-slate-300">
                              {categories.find((c) => c.id === tx.categoryId)?.name || 'General'}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Cuenta / Origen</span>
                            <strong className="text-slate-700 dark:text-slate-300">
                              {accounts.find((a) => a.id === tx.accountId)?.name || 'Billetera'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HOW TO SHARE FROM DIGITAL WALLETS & PWA */}
          {activeTab === 'wallets_guide' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-500/30 rounded-2xl text-white">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Comparte Comprobantes Directamente a FinanFlow
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      FinanFlow está habilitada como <strong>Destino de Compartir (Web Share Target)</strong> en tu teléfono.
                    </p>
                  </div>
                </div>
              </div>

              {/* Paso a paso */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>¿Por qué Nequi a veces no muestra FinanFlow en la lista de compartir?</span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                  Nequi suele compartir comprobantes como <strong>imagen/captura JPG</strong> o enlace temporal. Para que FinanFlow aparezca en compartir nativo de tu teléfono o lo captures en 1 segundo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200/50">
                    <strong className="text-indigo-600 dark:text-indigo-400 block mb-0.5">Método 1: Copiar / SMS (100% infalible)</strong>
                    Copia los datos de la transferencia o el SMS de confirmación. Al abrir FinanFlow, el detector inteligente lo procesa automáticamente.
                  </div>
                  <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200/50">
                    <strong className="text-indigo-600 dark:text-indigo-400 block mb-0.5">Método 2: Foto de Comprobante (Escáner OCR)</strong>
                    Si guardas o tomas captura de la pantalla de Nequi, ábrela en el botón <strong>"Escanear Ticket"</strong> con visión artificial.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Paso 1 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Instala FinanFlow (PWA)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    En Chrome (Android) o Safari (iOS), toca menú y presiona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong>. Esto registra FinanFlow en el sistema operativo.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    En Nequi / Billetera
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Al finalizar el movimiento, presiona <strong>"Compartir"</strong> (texto/enlace) o presiona <strong>"Copiar datos"</strong> del comprobante.
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Registro Instantáneo
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    FinanFlow abrirá el asistente de IA, categorizará el gasto y lo guardará en tus cuentas con un solo toque.
                  </p>
                </div>
              </div>

              {/* Billeteras Soportadas */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Formatos y Billeteras compatibles:
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['Nequi', 'Daviplata', 'Mercado Pago', 'Bancolombia', 'BBVA', 'Santander', 'Nu', 'RappiPay', 'Ualá', 'Bizum', 'Transfiya', 'PSE', 'Amazon', 'PayPal'].map((b) => (
                    <span key={b} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATION 100% (WEBHOOK & BACKGROUND INGESTION) */}
          {activeTab === 'auto_hub' && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl text-white relative overflow-hidden">
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Captura Automática en Segundo Plano
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Configura tu teléfono o correo para que cada vez que recibas un SMS bancario o factura de compra, se registre en FinanFlow <strong>sin abrir la app</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Webhook Endpoint Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Tu URL de Webhook de Ingesta Automática:
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Activo 24/7</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-mono select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? '¡Copiado!' : 'Copiar URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Método HTTP: <strong>POST</strong> | Formato: <code className="text-indigo-400">{"{ \"text\": \"mensaje del SMS o Factura\" }"}</code>
                </p>
              </div>

              {/* 3 Step Integration Guides */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Guías de Configuración en 1 Minuto:
                </h4>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Opción 1: Android (MacroDroid / Tasker) - Recomendada
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md">
                      100% Automático
                    </span>
                  </div>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                    <li>Instala <strong>MacroDroid</strong> (gratis en Google Play Store).</li>
                    <li>Crea una Macro: <strong>Disparador (Trigger)</strong> → <em>SMS Recibido</em> o <em>Notificación de app bancaria</em>.</li>
                    <li><strong>Acción (Action)</strong> → <em>Solicitud HTTP (POST)</em> → Pega tu URL de Webhook.</li>
                    <li>En el cuerpo del mensaje pon: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">{"{\"text\": \"[sms_message]\"}"}</code>.</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Opción 2: iPhone / iOS (Atajos de Apple)
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Abre la app <strong>Atajos</strong> en tu iPhone → Pestaña <strong>Automatización</strong> → <em>Cuando recibo un mensaje de [Banco]</em> → Agregar acción <em>"Obtener contenido de URL"</em> (POST a tu Webhook con el texto del mensaje).
                  </p>
                </div>
              </div>

              {/* LIVE SIMULATOR */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Probador en Vivo: Simula un SMS o Billetera Entrante
                  </span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400">Prueba el Webhook</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Ej. Nequi: Enviaste $65.000 a Restaurante..."
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-slate-800 dark:text-slate-200 font-mono"
                  />
                  <button
                    onClick={handleRunSimulator}
                    disabled={simLoading || !simText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all flex-shrink-0"
                  >
                    {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{simLoading ? 'Procesando...' : 'Enviar Prueba'}</span>
                  </button>
                </div>

                {simResult && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-200">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ¡Movimiento guardado automáticamente!
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(simResult.transaction.amount, settings)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Comercio: <strong>{simResult.transaction.description}</strong> | Categoría: <strong>{simResult.transaction.category}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-[11px] text-slate-400">
            {activeTab === 'parser' ? 'Procesado con Google Gemini 3.7 Flash' : 'Compatible con Nequi, Daviplata, Bancos y Webhooks'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Cerrar
            </button>
            {activeTab === 'parser' && extractedTransactions.length > 0 && (
              <button
                type="button"
                onClick={handleSaveSelected}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar {extractedTransactions.filter((t) => t.selected).length} Movimiento(s)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
