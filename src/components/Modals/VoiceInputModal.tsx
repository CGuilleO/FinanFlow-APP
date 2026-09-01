import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, AlertCircle, X, Volume2, Sparkle, Tag, Layers, ArrowRight } from 'lucide-react';
import { Account, Category, UserSettings } from '../../types';
import { addTransaction, formatCurrency } from '../../utils/storage';
import confetti from 'canvas-confetti';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
  onSuccess: () => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  settings,
  onSuccess,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted transaction draft
  const [draft, setDraft] = useState<{
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    accountId: string;
    tags: string[];
    notes: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const toggleListening = () => {
    setError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setDraft(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
        } else {
          setError('Tu navegador no soporta reconocimiento por voz directo. Puedes escribir o pegar la frase abajo.');
        }
      } catch (err: any) {
        console.error(err);
        setError('No se pudo acceder al micrófono. Verifica los permisos.');
        setIsListening(false);
      }
    }
  };

  const parseVoiceTextWithAI = async (textToParse: string) => {
    if (!textToParse.trim()) {
      setError('Por favor dicta o escribe una frase primero');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const availableCatNames = categories.map((c) => c.name);
      const availableAccNames = accounts.map((a) => a.name);

      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToParse,
          sourceType: 'voice',
          availableCategories: availableCatNames,
          availableAccounts: availableAccNames,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al procesar el texto por voz');
      }

      const json = await res.json();
      const firstTx = json.data?.transactions?.[0];

      if (!firstTx) {
        throw new Error('No se detectó un movimiento financiero en la frase dictada.');
      }

      // Match category & account IDs
      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes((firstTx.suggestedCategory || '').toLowerCase()) ||
        (firstTx.suggestedCategory || '').toLowerCase().includes(c.name.toLowerCase())
      ) || (firstTx.type === 'income' ? categories.find(c => c.type === 'income') : categories.find(c => c.type === 'expense')) || categories[0];

      const matchedAcc = accounts.find((a) =>
        a.name.toLowerCase().includes((firstTx.suggestedAccount || '').toLowerCase()) ||
        (firstTx.suggestedAccount || '').toLowerCase().includes(a.name.toLowerCase())
      ) || accounts[0];

      setDraft({
        type: firstTx.type === 'income' ? 'income' : firstTx.type === 'transfer' ? 'transfer' : 'expense',
        amount: Math.abs(firstTx.amount || 0),
        description: firstTx.description || 'Movimiento por voz',
        date: firstTx.date || new Date().toISOString().split('T')[0],
        categoryId: matchedCat.id,
        accountId: matchedAcc.id,
        tags: firstTx.tags || ['voz', 'dictado'],
        notes: firstTx.notes || `Dictado por voz: "${textToParse}"`,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al interpretar la voz con IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTransaction = () => {
    if (!draft || draft.amount <= 0) return;

    addTransaction({
      type: draft.type,
      amount: draft.amount,
      description: draft.description,
      date: draft.date,
      categoryId: draft.categoryId,
      accountId: draft.accountId,
      tags: draft.tags,
      notes: draft.notes,
      source: 'voice',
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onSuccess();
    onClose();
  };

  const samplePhrases = [
    'Gasté 42 euros en la cena de anoche con tarjeta',
    'Compré víveres en el supermercado por 65.50 con efectivo #comida',
    'Recibí 750 euros por un trabajo freelance de diseño',
    'Pagué la factura de luz de 58 euros desde la cuenta nómina',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Captura por Voz con IA
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Dictado Natural
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Habla naturalmente y Gemini categorizará tu gasto o ganancia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Voice Record Button & Sound Wave */}
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-400/30'
                  : 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white hover:scale-105 shadow-rose-500/30'
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-4">
              {isListening ? 'Escuchando... Di tu gasto o ingreso' : 'Toca el micrófono para comenzar'}
            </span>
            <p className="text-[11px] text-slate-400 text-center mt-1">
              {isListening
                ? 'Pulsa de nuevo para detener y procesar'
                : 'Ejemplo: "Ayer gasté 35 euros en combustible en Repsol con tarjeta"'}
            </p>
          </div>

          {/* Transcript input / edit box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                Texto Detectado / Frase
              </span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Limpiar
                </button>
              )}
            </label>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Dicta con el micrófono o escribe aquí directamente..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Action to Process */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isProcessing || !transcript.trim()}
              onClick={() => parseVoiceTextWithAI(transcript)}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkle className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Analizando con Gemini...' : 'Interpretar y Extraer Datos'}
            </button>
          </div>

          {/* Quick Examples Pills */}
          {!draft && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                O prueba con una frase de ejemplo:
              </span>
              <div className="space-y-1.5">
                {samplePhrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(phrase);
                      parseVoiceTextWithAI(phrase);
                    }}
                    className="w-full text-left p-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>"{phrase}"</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Transaction Draft Confirmation */}
          {draft && (
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Datos Extraídos con Éxito
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200">
                  {draft.type === 'income' ? 'Ingreso' : draft.type === 'transfer' ? 'Transferencia' : 'Gasto'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Descripción:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{draft.description}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Monto:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatCurrency(draft.amount, settings)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Categoría:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {categories.find((c) => c.id === draft.categoryId)?.name || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cuenta:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {accounts.find((a) => a.id === draft.accountId)?.name || 'Cuenta'}
                  </span>
                </div>
              </div>

              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {draft.tags.map((t) => (
                    <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          {draft && (
            <button
              type="button"
              onClick={handleSaveTransaction}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Guardar Movimiento ({formatCurrency(draft.amount, settings)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
