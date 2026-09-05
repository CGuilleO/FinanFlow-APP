import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone, CheckCircle2, Share2, HelpCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if user is on iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt on Chromium / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsStandalone(true);
        }
      } catch (err) {
        console.error('Error launching install prompt:', err);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // If already installed in standalone mode or dismissed, don't show the floating banner
  if (isStandalone || isDismissed) {
    return (
      <>
        {showGuideModal && renderGuideModal()}
      </>
    );
  }

  function renderGuideModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/icon-192.png"
                alt="FinanFlow AI"
                className="w-11 h-11 rounded-2xl object-cover shadow-md shadow-indigo-600/30 border border-white/10"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Instalar FinanFlow como App Nativa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sin barra de navegador, pantalla completa y acceso rápido
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            {isIOS ? (
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                <p className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  En iPhone / iPad (Safari):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] pl-1">
                  <li>Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba ⬆️ en Safari).</li>
                  <li>Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
                  <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</li>
                </ol>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                <p className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  En Android (Chrome / Brave / Edge):
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] pl-1">
                  <li>Toca los <strong>tres puntos (⋮)</strong> en la esquina superior derecha de Chrome.</li>
                  <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                  <li>Acepta el diálogo de instalación. Se creará una <strong>aplicación independiente WebAPK</strong> con su propio ícono.</li>
                </ol>
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Ventajas de la App Nativa instalada:
              </span>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                <li>Se abre en pantalla completa sin barra de direcciones de Chrome.</li>
                <li>Habilita el receptor de comprobantes compartidos de billeteras.</li>
                <li>Acceso instantáneo con un toque desde tu inicio.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setShowGuideModal(false)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-cyan-900 text-white px-4 py-2.5 border-b border-indigo-700/50 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/icon-192.png"
            alt="FinanFlow AI"
            className="w-8 h-8 rounded-xl object-cover flex-shrink-0 border border-white/20 shadow-sm"
          />
          <div className="truncate">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Instala FinanFlow como App Nativa</span>
              <span className="px-1.5 py-0.2 bg-cyan-400/20 text-cyan-200 text-[10px] font-extrabold rounded-md border border-cyan-400/30">
                PWA
              </span>
            </p>
            <p className="text-[11px] text-indigo-200 truncate">
              Úsala en pantalla completa y comparte comprobantes de Nequi directamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-indigo-900 text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Instalar App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-indigo-300 hover:text-white rounded-lg transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGuideModal && renderGuideModal()}
    </>
  );
};
