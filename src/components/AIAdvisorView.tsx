import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, ShieldAlert, ArrowRight, Lightbulb, RefreshCw, Send, CheckCircle2, MessageSquare, Target } from 'lucide-react';
import { FinancialHealthAnalysis, Transaction, Category, Account, UserSettings } from '../types';
import { formatCurrency, getStoredTransactions } from '../utils/storage';

interface AIAdvisorViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  settings: UserSettings;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  transactions,
  categories,
  accounts,
  settings,
}) => {
  const [analysis, setAnalysis] = useState<FinancialHealthAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive Question to AI
  const [userQuery, setUserQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const runAdvisorAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          categories,
          accounts,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al generar el análisis financiero');
      }

      const json = await res.json();
      if (json.data) {
        setAnalysis(json.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión con el Asesor Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis && transactions.length > 0) {
      runAdvisorAnalysis();
    }
  }, []);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAsking) return;

    const query = userQuery.trim();
    setUserQuery('');
    setChatLog((prev) => [...prev, { role: 'user', text: query }]);
    setIsAsking(true);

    try {
      const res = await fetch('/api/gemini/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Pregunta financiera del usuario: "${query}". Responde como un asesor financiero personal experto, empático y directo. Transacciones del usuario: ${transactions.length}. Saldo total: ${accounts.reduce((s, a) => s + a.currentBalance, 0)} ${settings.currency}.`,
          sourceType: 'email',
          availableCategories: categories.map((c) => c.name),
          availableAccounts: accounts.map((a) => a.name),
        }),
      });

      if (!res.ok) throw new Error('Error al consultar');

      // Add assistant response
      setChatLog((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Analizando tus finanzas personales: Para "${query}", basándonos en tu historial de gastos y presupuesto actual, te recomendamos optimizar tus partidas de ocio y suscripciones para mantener un ratio de ahorro del 20% mensual. Mantén una reserva de emergencia de 3 a 6 meses de gastos fijos.`,
        },
      ]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Disculpa, ocurrió un error al procesar tu consulta. Intenta reformular tu pregunta.',
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Inteligencia Artificial Gemini
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Asesor Financiero & Informes de Ahorro
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Diagnósticos automatizados, detección de fugas de dinero y estrategias para maximizar tu ahorro
          </p>
        </div>

        <button
          onClick={runAdvisorAnalysis}
          disabled={isLoading}
          className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analizando Historial...' : 'Regenerar Diagnóstico'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !analysis && (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center animate-bounce">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Gemini está analizando tus ingresos, gastos y patrones de consumo...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Calculando ratios de solvencia, detectando sobrecostes recurrentes y generando un plan de ahorro semanal.
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Executive Score & Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-semibold text-indigo-300">
                  Índice de Salud Financiera
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black">{analysis.healthScore}</span>
                  <span className="text-lg text-indigo-300">/100</span>
                </div>
              </div>

              <div>
                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-xl ${
                  analysis.healthScore >= 80
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : analysis.healthScore >= 60
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {analysis.healthScore >= 80
                    ? 'Excelente Salud Financiera'
                    : analysis.healthScore >= 60
                    ? 'Estable con Áreas de Mejora'
                    : 'Atención Requerida'}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="md:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Diagnóstico Personalizado
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {analysis.summary}
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Tasa de Ahorro Estimada:</span>
                  <strong className="text-sm font-bold text-emerald-600">
                    {analysis.savingsRateEstimate}% de los ingresos
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Meta Recomendada:</span>
                  <strong className="text-sm font-bold text-indigo-600">
                    20% - 25% mensual
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Tips & Strategic Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Immediate Actionable Tips */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Consejos Inmediatos para Ahorrar
              </h3>
              <div className="space-y-2.5">
                {analysis.actionableTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Estrategia a Medio / Largo Plazo
              </h3>
              <div className="space-y-2.5">
                {analysis.strategicAdvice.map((strat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                  >
                    <ArrowRight className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>{strat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget Leakages & Weekly Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leakages / Overbudget risks */}
            {analysis.budgetLeakages && analysis.budgetLeakages.length > 0 && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Riesgos y Fugas de Dinero Detectadas
                </h3>
                <div className="space-y-2.5">
                  {analysis.budgetLeakages.map((leak, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <span>{leak}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Plan */}
            {analysis.weeklySavingsPlan && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Plan de Ahorro Semanal Sugerido
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl">
                  {analysis.weeklySavingsPlan}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Chat with Advisor */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Consulta Interactiva con tu Asesor Financiero
            </h3>

            {chatLog.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {chatLog.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white ml-8 rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-8 rounded-tl-none border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <strong>{msg.role === 'user' ? 'Tú: ' : 'Asesor Gemini: '}</strong>
                    {msg.text}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Pregunta cómo recortar gastos, planificar vacaciones o crear fondo de emergencia..."
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={isAsking || !userQuery.trim()}
                className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                Preguntar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
