import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, Check, X, ArrowRight } from 'lucide-react';
import { Account, Category, UserSettings } from '../types';
import { addMultipleTransactions, formatCurrency } from '../utils/storage';
import confetti from 'canvas-confetti';

interface ClipboardQuickDetectorProps {
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
  onOpenManualModal: (prefilledText?: string) => void;
}

// Regex and keywords to detect banking SMS, digital wallets, and receipt patterns
const BANK_KEYWORDS = [
  'compra',
  'cargo',
  'transferencia',
  'transferiste',
  'enviaste',
  'recibiste',
  'pagaste',
  'pago',
  'debito',
  'débito',
  'credito',
  'crédito',
  'bancolombia',
  'bbva',
  'santander',
  'nu',
  'nequi',
  'daviplata',
  'itau',
  'davivienda',
  'mercadopago',
  'mercado pago',
  'rappipay',
  'rappi',
  'uala',
  'ualá',
  'transfiya',
  'pse',
  'bizum',
  'pix',
  'spei',
  'clabe',
  'zelle',
  'paypal',
  'cashapp',
  'revolut',
  'monzo',
  'apple pay',
  'google pay',
  'comprobante',
  'referencia',
  'monto',
  'valor',
  'saldo',
  'retiro',
  'tarjeta',
  'aprobado',
  'autorizacion',
  'autorización',
  'transaccion',
  'transacción',
  'exitoso',
  'exitosa',
  'factura',
  'amazon',
];

export const ClipboardQuickDetector: React.FC<ClipboardQuickDetectorProps> = ({
  categories,
  accounts,
  settings,
  onSuccess,
  onOpenManualModal,
}) => {
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedText, setDismissedText] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<any | null>(null);

  // Check clipboard when window gets focus or user returns to tab
  const checkClipboard = async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || clipText.trim().length < 15 || clipText.length > 1000) return;
      if (clipText === dismissedText || clipText === detectedText) return;

      const lower = clipText.toLowerCase();
      const matchCount = BANK_KEYWORDS.filter((k) => lower.includes(k)).length;

      // If it contains digits AND (at least 1 wallet/banking keyword OR matchCount >= 1 with currency symbols/indicators)
      const hasCurrencyOrDigit = /[\$\€\£]|(\b\d{2,}\b)/.test(clipText);
      const isStrongWalletMatch =
        lower.includes('nequi') ||
        lower.includes('daviplata') ||
        lower.includes('enviaste') ||
        lower.includes('transferiste') ||
        lower.includes('pagaste') ||
        lower.includes('recibiste') ||
        lower.includes('bancolombia') ||
        lower.includes('comprobante') ||
        lower.includes('referencia') ||
        lower.includes('aprobado') ||
        lower.includes('tarjeta');

      if (hasCurrencyOrDigit && (isStrongWalletMatch || matchCount >= 1)) {
        setDetectedText(clipText);
      }
    } catch {
      // Clipboard read permission might be rejected silently
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      checkClipboard();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkClipboard();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [dismissedText, detectedText]);

  const handleProcessAuto = async () => {
    if (!detectedText) return;
    setIsProcessing(true);

    try {
      const availableCatNames = categories.map((c) => c.name);
      const availableAccNames = accounts.map((a) => a.name);

      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: detectedText,
          sourceType: 'sms',
          availableCategories: availableCatNames,
          availableAccounts: availableAccNames,
        }),
      });

      if (!res.ok) throw new Error('Error al procesar');
      const json = await res.json();
      const rawTxs = json.data?.transactions || [];

      if (rawTxs.length > 0) {
        const item = rawTxs[0];
        const matchedCat = categories.find((c) =>
          c.name.toLowerCase().includes((item.suggestedCategory || '').toLowerCase())
        ) || (item.type === 'income' ? categories.find(c => c.type === 'income') : categories.find(c => c.type === 'expense')) || categories[0];

        const matchedAcc = accounts.find((a) =>
          a.name.toLowerCase().includes((item.suggestedAccount || '').toLowerCase())
        ) || accounts[0];

        const tx = {
          type: item.type === 'income' ? 'income' as const : item.type === 'transfer' ? 'transfer' as const : 'expense' as const,
          amount: Math.abs(item.amount || 0),
          description: item.description || 'Gasto detectado',
          date: item.date || new Date().toISOString().split('T')[0],
          categoryId: matchedCat.id,
          accountId: matchedAcc.id,
          tags: item.tags || ['sms-auto', 'portapapeles'],
          notes: item.notes || 'Auto-capturado desde el portapapeles',
          source: 'sms' as const,
        };

        setExtractedPreview(tx);
      } else {
        onOpenManualModal(detectedText);
        setDetectedText(null);
      }
    } catch {
      onOpenManualModal(detectedText);
      setDetectedText(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = () => {
    if (!extractedPreview) return;
    addMultipleTransactions([extractedPreview]);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.8 },
    });
    setDismissedText(detectedText);
    setDetectedText(null);
    setExtractedPreview(null);
    onSuccess();
  };

  const handleDismiss = () => {
    setDismissedText(detectedText);
    setDetectedText(null);
    setExtractedPreview(null);
  };

  if (!detectedText) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 text-white shadow-2xl shadow-indigo-600/30 backdrop-blur-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                ⚡ SMS / Notificación en Portapapeles
              </span>
              <span className="text-[10px] text-cyan-300 font-medium block">
                FinanFlow AI puede registrarlo en 1 click
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Snippet */}
        {!extractedPreview ? (
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-indigo-900/50 mb-3 text-[11px] font-mono text-slate-300 line-clamp-2">
            "{detectedText}"
          </div>
        ) : (
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/40 mb-3 text-xs">
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="text-emerald-300">{extractedPreview.description}</span>
              <span className="text-emerald-400 font-extrabold">
                {formatCurrency(extractedPreview.amount, settings)}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-3">
              <span>{extractedPreview.date}</span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">
                {categories.find((c) => c.id === extractedPreview.categoryId)?.name || 'General'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 relative z-10">
          {!extractedPreview ? (
            <>
              <button
                onClick={handleProcessAuto}
                disabled={isProcessing}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Analizando con IA...' : 'Auto-Detectar con IA'}
              </button>
              <button
                onClick={() => {
                  onOpenManualModal(detectedText);
                  handleDismiss();
                }}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <span>Editar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar Automáticamente
              </button>
              <button
                onClick={() => {
                  onOpenManualModal(detectedText);
                  handleDismiss();
                }}
                className="py-2 px-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Ajustar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
