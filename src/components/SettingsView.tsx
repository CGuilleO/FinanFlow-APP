import React, { useState } from 'react';
import { Settings, Moon, Sun, DollarSign, Bell, Shield, Database, Trash2, CheckCircle2, RefreshCw, Smartphone, ExternalLink, Globe, AlertTriangle, Mail, Sparkles } from 'lucide-react';
import { UserSettings } from '../types';
import { APP_VERSION, BUILD_DATE, APP_RELEASE_NAME } from '../version';
import { saveStoredSettings, seedInitialData, clearAllTransactionsAndData, clearOnlyTransactions, syncCurrentDataToCloud } from '../utils/storage';
import { getCachedGmailAccessToken } from '../lib/firebase';
import { InsightsIcon, InsightsLogo } from './InsightsLogo';
import confetti from 'canvas-confetti';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onRefreshAllData: () => void;
  onOpenGmailScanner?: () => void;
}

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense ($)' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano ($)' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano ($)' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino ($)' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno ($)' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano (S/)' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina (£)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
  onOpenGmailScanner,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCurrencyChange = (currCode: string) => {
    const found = CURRENCIES.find((c) => c.code === currCode);
    if (found) {
      const updated: UserSettings = {
        ...localSettings,
        currency: found.code,
        currencySymbol: found.symbol,
      };
      setLocalSettings(updated);
      saveStoredSettings(updated);
      onUpdateSettings(updated);
      showSavedToast();
    }
  };

  const handleToggleTheme = () => {
    const updated: UserSettings = {
      ...localSettings,
      theme: localSettings.theme === 'dark' ? 'light' : 'dark',
    };
    setLocalSettings(updated);
    saveStoredSettings(updated);
    onUpdateSettings(updated);
  };

  const handleToggleNotifications = (field: keyof UserSettings) => {
    const updated: UserSettings = {
      ...localSettings,
      [field]: !localSettings[field],
    };
    setLocalSettings(updated);
    saveStoredSettings(updated);
    onUpdateSettings(updated);
    showSavedToast();
  };

  const handleThresholdChange = (val: number) => {
    const updated: UserSettings = {
      ...localSettings,
      budgetAlertThreshold: val,
    };
    setLocalSettings(updated);
    saveStoredSettings(updated);
    onUpdateSettings(updated);
    showSavedToast();
  };

  const showSavedToast = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClearOnlyTransactions = async () => {
    if (window.confirm('¿Estás seguro de borrar todos los movimientos y dejar las cuentas en $0? Esto te permitirá importar tu archivo CSV desde cero sin duplicados. Se sincronizará inmediatamente con tu teléfono.')) {
      clearOnlyTransactions(true);
      await syncCurrentDataToCloud();
      onRefreshAllData();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleResetAllCompletely = async () => {
    if (window.confirm('¿Estás seguro de vaciar COMPLETAMENTE la base de datos (movimientos, facturas, metas y presupuestos)?')) {
      clearAllTransactionsAndData();
      await syncCurrentDataToCloud();
      onRefreshAllData();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleResetData = async () => {
    if (window.confirm('¿Estás seguro de restablecer todos los datos a la configuración inicial de demostración? Se borrarán tus cambios locales actuales.')) {
      seedInitialData(true);
      await syncCurrentDataToCloud();
      onRefreshAllData();
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Configuración del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Personaliza tu moneda principal, preferencias de alertas y sincronización
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuración actualizada correctamente.</span>
        </div>
      )}

      {/* 1. General & Localization Preferences */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-indigo-600" />
          Moneda y Apariencia
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Currency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Moneda Principal
            </label>
            <select
              value={localSettings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Modo Visual
            </label>
            <button
              type="button"
              onClick={handleToggleTheme}
              className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between transition-colors text-slate-800 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                {localSettings.theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                Tema Actual: {localSettings.theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                Cambiar
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Notifications & Smart Alerts */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          Alertas de Presupuesto y Notificaciones
        </h3>

        <div className="space-y-4">
          {/* Threshold slider */}
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span>Umbral de Alerta de Presupuesto Excedido:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {localSettings.budgetAlertThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={localSettings.budgetAlertThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Recibirás advertencias visuales y notificaciones cuando tus gastos alcancen este porcentaje de la categoría.
            </p>
          </div>

          {/* Toggle 1: In-app notifications */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Alarmas de Facturas y Vencimientos
              </h4>
              <p className="text-[11px] text-slate-400">
                Avisos 3 días antes de que venza una suscripción o recibo
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableNotifications}
              onChange={() => handleToggleNotifications('enableNotifications')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Toggle 2: AI Weekly Insights */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Informes Semanales Automatizados con Gemini
              </h4>
              <p className="text-[11px] text-slate-400">
                Genera sugerencias de ahorro y balance cada lunes
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableAIExtraction}
              onChange={() => handleToggleNotifications('enableAIExtraction')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 2.1. Gmail & Electronic Invoices Integration */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rastreador de Facturas y Recibos de Gmail
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-black rounded bg-gradient-to-r from-red-500 to-indigo-600 text-white shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> IA
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sincroniza y detecta automáticamente facturas electrónicas (DIAN), servicios públicos (EPM, Enel, Claro) y compras.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className={`w-2.5 h-2.5 rounded-full ${getCachedGmailAccessToken() ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>Estado: {getCachedGmailAccessToken() ? 'Conectado a Gmail' : 'Listo para escanear'}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Usa el botón para buscar tus comprobantes recientes sin ingresar datos manualmente.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenGmailScanner}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all shrink-0"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Abrir Escáner de Gmail</span>
          </button>
        </div>
      </div>

      {/* 3. About Insights Solutions SAS */}
      <div className="p-6 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center p-2 shadow-md border border-slate-200 dark:border-slate-700 flex-shrink-0">
              <InsightsIcon className="w-full h-auto" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <InsightsLogo className="h-6" />
                <span className="text-xs font-bold text-slate-400">Solutions SAS</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                FinanFlow es desarrollado e impulsado por <strong>Insights Solutions SAS</strong>.
              </p>
            </div>
          </div>

          <a
            href="https://insights.com.co"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0072CE] hover:bg-[#005fa8] shadow-md shadow-[#0072CE]/20 transition-all self-start sm:self-auto"
          >
            <Globe className="w-4 h-4" />
            <span>Visitar insights.com.co</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800/80">
          Soluciones de análisis de datos, inteligencia artificial aplicada y desarrollo tecnológico empresarial y financiero. Diseñado para transformar datos complejos en decisiones estratégicas claras.
        </p>
      </div>

      {/* 4. Mobile PWA & Multi-device Sync */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-500" />
          Experiencia Móvil y de Escritorio (PC / Móvil)
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          FinanFlow está diseñado con una arquitectura adaptable responsive de alta fidelidad. Puedes usar la app en tu teléfono inteligente escaneando tickets con la cámara integrada o desde tu computadora de escritorio importando archivos CSV bancarios sin perder información.
        </p>
      </div>

      {/* 5. Danger Zone & Reset */}
      <div className="p-6 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-3xl space-y-5">
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-600" />
          Gestión de Datos, Limpieza y Reimportación
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Clear Only Movements */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              Vaciar Movimientos (Reimportación Limpia)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Elimina todos los movimientos y reinicia los saldos a $0 sin alterar tus categorías o ajustes. Ideal si vas a importar tu archivo CSV de AndroMoney completo.
            </p>
            <button
              type="button"
              onClick={handleClearOnlyTransactions}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-all w-full justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vaciar Historial de Movimientos
            </button>
          </div>

          {/* Option B: Reset to Demo Defaults */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-rose-500" />
              Restablecer Datos de Demostración
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Restaura la aplicación con los ejemplos de presupuestos, metas y movimientos prediseñados.
            </p>
            <button
              type="button"
              onClick={handleResetData}
              className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-all w-full justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar Demostración Inicial
            </button>
          </div>
        </div>
      </div>

      {/* System & Release Version Information */}
      <div className="p-5 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            v
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white">
                FinanFlow AI
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {APP_RELEASE_NAME} · Compilación: {BUILD_DATE}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistema en Línea & Actualizado</span>
        </div>
      </div>
    </div>
  );
};
