import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  BellRing,
  Sparkles,
  Settings as SettingsIcon,
  Plus,
  Camera,
  Mic,
  MessageSquare,
  FileSpreadsheet,
  Cloud,
  Moon,
  Sun,
  Menu,
  X,
  Wallet,
  CheckCircle2,
  LogOut,
  UserPlus,
  User,
  Trash2,
  RotateCcw,
  RefreshCw,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Account, BillReminder, Category, FinancialHealthAnalysis, Transaction, UserSettings, UserSession } from './types';
import { APP_VERSION, BUILD_DATE } from './version';
import { FinanFlowLogo } from './components/FinanFlowLogo';
import { InsightsIcon, InsightsLogo, InsightsBadge } from './components/InsightsLogo';
import { AuthModal } from './components/AuthModal';
import { getCurrentSession, logoutUser, loginUser } from './utils/authStorage';
import {
  getStoredAccounts,
  getStoredBills,
  getStoredCategories,
  getStoredSettings,
  getStoredTransactions,
  saveStoredSettings,
  seedInitialData,
  formatCurrency,
  clearAllTransactionsAndData,
  applyCloudDataLocally,
  subscribeToStore,
  syncCurrentDataToCloud,
  getEffectiveUserId,
} from './utils/storage';
import { subscribeToUserCloudData, fetchUserCloudData, pushUserCloudData } from './lib/firebase';

// Views
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsCategoriesView } from './components/BudgetsCategoriesView';
import { BillsRemindersView } from './components/BillsRemindersView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { SettingsView } from './components/SettingsView';
import { PrivacyPolicyView } from './components/Legal/PrivacyPolicyView';
import { TermsOfServiceView } from './components/Legal/TermsOfServiceView';

// Modals
import { OCRScannerModal } from './components/Modals/OCRScannerModal';
import { VoiceInputModal } from './components/Modals/VoiceInputModal';
import { SmartParserModal } from './components/Modals/SmartParserModal';
import { TransactionModal } from './components/Modals/TransactionModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { GmailInvoiceScannerModal } from './components/Modals/GmailInvoiceScannerModal';
import { BankStatementExtractorModal } from './components/Modals/BankStatementExtractorModal';
import { DeviceSyncVerifyModal } from './components/Modals/DeviceSyncVerifyModal';
import { UserAccountModal } from './components/Modals/UserAccountModal';
import { ClipboardQuickDetector } from './components/ClipboardQuickDetector';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  // Public Route State (for Privacy Policy, Terms of Service, or Main App)
  const [currentRoute, setCurrentRoute] = useState<'app' | 'privacy' | 'terms'>(() => {
    if (typeof window === 'undefined') return 'app';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.startsWith('/privacy') || path.startsWith('/privacidad') || hash.includes('privacy') || hash.includes('privacidad')) {
      return 'privacy';
    }
    if (path.startsWith('/terms') || path.startsWith('/terminos') || hash.includes('terms') || hash.includes('terminos')) {
      return 'terms';
    }
    return 'app';
  });

  const navigateTo = (route: 'app' | 'privacy' | 'terms') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = route === 'app' ? '/' : `/${route}`;
      window.history.pushState({}, '', targetPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith('/privacy') || path.startsWith('/privacidad') || hash.includes('privacy') || hash.includes('privacidad')) {
        setCurrentRoute('privacy');
      } else if (path.startsWith('/terms') || path.startsWith('/terminos') || hash.includes('terms') || hash.includes('terminos')) {
        setCurrentRoute('terms');
      } else {
        setCurrentRoute('app');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'advisor' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialTagFilter, setInitialTagFilter] = useState<string | undefined>(undefined);

  // User Auth & Session state
  const [session, setSession] = useState<UserSession | null>(() => getCurrentSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !getCurrentSession());
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'switch'>('login');
  const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState(false);

  const handleOpenAuth = (mode: 'login' | 'register' | 'switch' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // App Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bills, setBills] = useState<BillReminder[]>([]);
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [aiAdvice, setAiAdvice] = useState<FinancialHealthAnalysis | null>(null);

  // Modal States
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [sharedImageBlob, setSharedImageBlob] = useState<Blob | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [smsPrefilledText, setSmsPrefilledText] = useState<string>('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isBankStatementModalOpen, setIsBankStatementModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isDeviceSyncModalOpen, setIsDeviceSyncModalOpen] = useState(false);

  // Load data & seed on mount
  const refreshAllData = () => {
    seedInitialData(false);
    setTransactions(getStoredTransactions());
    setCategories(getStoredCategories());
    setAccounts(getStoredAccounts());
    setBills(getStoredBills());
    setSettings(getStoredSettings());
  };

  // Subscribe to local store changes
  useEffect(() => {
    const unsubStore = subscribeToStore(() => {
      setTransactions(getStoredTransactions());
      setCategories(getStoredCategories());
      setAccounts(getStoredAccounts());
      setBills(getStoredBills());
      setSettings(getStoredSettings());
    });
    return () => unsubStore();
  }, []);

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const showSyncToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      const effectiveId = getEffectiveUserId();
      const localTxs = getStoredTransactions();

      // Check server first to see if server has richer data
      const cloudData = await fetchUserCloudData(effectiveId);
      const cloudTxCount = cloudData?.transactions?.length || 0;

      if (cloudData && cloudTxCount > localTxs.length) {
        applyCloudDataLocally(cloudData);
        refreshAllData();
        showSyncToast(`¡Datos sincronizados desde el servidor! (${cloudTxCount} movimientos restaurados)`);
      } else if (localTxs.length > 0) {
        await syncCurrentDataToCloud();
        showSyncToast(`¡Guardado en el servidor! (${localTxs.length} movimientos sincronizados)`);
      } else if (cloudData) {
        applyCloudDataLocally(cloudData);
        refreshAllData();
        showSyncToast(`¡Sincronización completada! (${cloudTxCount} movimientos)`);
      } else {
        showSyncToast('Servidor listo y sincronizado');
      }
    } catch (err) {
      console.error('Error during manual sync:', err);
      showSyncToast('Error de sincronización. Verifica tu conexión.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Subscribe to Central Server Persistence and Cloud real-time changes across devices
  useEffect(() => {
    refreshAllData();
    const effectiveId = getEffectiveUserId();

    // 1. Initial check:
    // First, fetch from server to see if server has rich data (e.g. mobile opening for first time)
    fetchUserCloudData(effectiveId).then((cloudData) => {
      const localTxs = getStoredTransactions();
      const cloudTxCount = cloudData?.transactions?.length || 0;

      if (cloudData && cloudTxCount > localTxs.length) {
        // Server has more transactions -> Adopt server data!
        applyCloudDataLocally(cloudData);
        refreshAllData();
      } else if (localTxs.length > 0) {
        // Local has rich data (PC) -> Push to server so mobile can access it!
        syncCurrentDataToCloud().catch(console.error);
      }
    }).catch(console.error);

    // 2. Real-time subscription across devices
    const unsubCloud = subscribeToUserCloudData(effectiveId, (cloudData) => {
      if (cloudData && (cloudData.transactions !== undefined || cloudData.accounts !== undefined)) {
        const localTxs = getStoredTransactions();
        const incomingCount = cloudData.transactions?.length || 0;
        // Don't overwrite if local is richer unless incoming has valid transactions
        if (incomingCount >= localTxs.length || localTxs.length <= 4) {
          applyCloudDataLocally(cloudData);
          refreshAllData();
        }
      }
    });

    return () => unsubCloud();
  }, [session?.userId, session?.email]);

  // Handle incoming shared transactions via Web Share Target (from Nequi, Daviplata, BBVA, etc.)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');

      // Check if an image receipt was shared directly from Nequi / Gallery
      if (action === 'shared_image') {
        caches.open('shared-receipts').then((cache) => {
          cache.match('/shared-image').then((resp) => {
            if (resp) {
              resp.blob().then((blob) => {
                setSharedImageBlob(blob);
                setIsOCRModalOpen(true);
                window.history.replaceState({}, document.title, window.location.pathname);
              });
            }
          });
        }).catch(console.error);
        return;
      }

      const sharedText =
        urlParams.get('share_text') ||
        urlParams.get('text') ||
        urlParams.get('shared_text') ||
        urlParams.get('share_title') ||
        urlParams.get('title') ||
        '';

      if (sharedText && sharedText.trim()) {
        // Clean URL without reloading page
        window.history.replaceState({}, document.title, window.location.pathname);
        setSmsPrefilledText(sharedText);
        setIsSMSModalOpen(true);
      }
    } catch (e) {
      console.error('Error parsing share target params:', e);
    }
  }, []);

  // Global window paste listener for capturing digital wallet receipts anywhere in the app
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an active input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim().length > 10) {
        setSmsPrefilledText(pastedText);
        setIsSMSModalOpen(true);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleAuthSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setIsAuthModalOpen(false);
    refreshAllData();
  };

  const handleLogout = () => {
    logoutUser();
    setSession(null);
    setAuthModalMode('login');
    setIsUserAccountModalOpen(false);
    setIsAuthModalOpen(true);
    refreshAllData();
  };

  const handleClearAllData = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todos los datos de muestra y dejar la billetera en $0 para tus registros reales?')) {
      clearAllTransactionsAndData();
      refreshAllData();
    }
  };

  // Theme toggle helper
  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: newTheme as any };
    setSettings(updated);
    saveStoredSettings(updated);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  // Sync dark mode class with html root and body on mount/update
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings.theme]);

  // Open Transaction Modal for Edit
  const handleEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleOpenNewTx = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };

  const handleNavigateToTransactions = (filterTag?: string) => {
    setInitialTagFilter(filterTag);
    setActiveTab('transactions');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimientos', icon: ReceiptText, count: transactions.length },
    { id: 'budgets', label: 'Presupuestos & Cuentas', icon: PieChart },
    { id: 'bills', label: 'Facturas & Alarmas', icon: BellRing, badge: bills.filter(b => b.status === 'pending').length },
    { id: 'advisor', label: 'Asesor IA & Ahorro', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  if (currentRoute === 'privacy') {
    return (
      <PrivacyPolicyView
        onBack={() => navigateTo('app')}
        onNavigateToTerms={() => navigateTo('terms')}
      />
    );
  }

  if (currentRoute === 'terms') {
    return (
      <TermsOfServiceView
        onBack={() => navigateTo('app')}
        onNavigateToPrivacy={() => navigateTo('privacy')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 px-1 py-1 mb-5">
          <FinanFlowLogo size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white truncate">
                Finan<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800">
                AI
              </span>
            </div>
            <a
              href="https://insights.com.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-[#0072CE] dark:hover:text-[#38a3f8] font-medium flex items-center gap-1 transition-colors"
            >
              por Insights Solutions SAS ↗
            </a>
          </div>
        </div>

        {/* Quick Add Main Button */}
        <button
          onClick={handleOpenNewTx}
          className="w-full py-2.5 px-4 mb-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Anotar Movimiento
        </button>

        {/* AI Shortcuts in Sidebar */}
        <div className="space-y-1 mb-6">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Captura Inteligente IA
          </span>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => setIsOCRModalOpen(true)}
              title="Escanear ticket con cámara"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="text-[9px] font-semibold truncate w-full text-center">Ticket</span>
            </button>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              title="Dictar por voz"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span className="text-[9px] font-semibold truncate w-full text-center">Voz</span>
            </button>
            <button
              onClick={() => setIsSMSModalOpen(true)}
              title="Leer SMS bancario o factura"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[9px] font-semibold truncate w-full text-center">SMS</span>
            </button>
            <button
              onClick={() => setIsGmailModalOpen(true)}
              title="Rastrear facturas de Gmail"
              className="p-2 rounded-xl bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Mail className="w-4 h-4" />
              <span className="text-[9px] font-semibold truncate w-full text-center">Gmail</span>
            </button>
          </div>
        </div>

        {/* User Account / Session Profile Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                {session ? session.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {session ? session.name : 'Modo Invitado'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {session ? session.email : 'Sin cuenta activa'}
                </p>
              </div>
            </div>
            {session ? (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                title="Cerrar Sesión / Cambiar Cuenta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer"
                title="Registrarse / Iniciar Sesión"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Navegación
          </span>
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-200/80 dark:border-indigo-800/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.highlight && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                      GEMINI
                    </span>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && !item.badge && (
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Import/Export & Theme & Cloud status & Insights Branding */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-800"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              PDF / Excel / CSV
            </span>
            <span className="text-[10px] text-slate-400">Exportar</span>
          </button>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </span>
            <button
              onClick={handleToggleTheme}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Cambiar tema claro/oscuro"
            >
              {settings.theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>
          </div>

          {/* Insights Solutions Attribution, Legal Links & App Version */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <InsightsBadge />
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => navigateTo('privacy')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors cursor-pointer"
              >
                Privacidad
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => navigateTo('terms')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors cursor-pointer"
              >
                Términos
              </button>
            </div>
            <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>Versión</span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {APP_VERSION}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVBAR (Compact, Bulletproof, Zero-Overflow) */}
      <header className="md:hidden flex items-center justify-between px-3 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        {/* Brand / Logo */}
        <div 
          onClick={() => {
            setActiveTab('dashboard');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2 min-w-0 cursor-pointer"
        >
          <FinanFlowLogo size="sm" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white truncate">
              Finan<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
            </span>
            <span className="px-1 py-0.2 text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/80 dark:border-indigo-800 flex-shrink-0">
              AI
            </span>
          </div>
        </div>

        {/* Compact Right Actions - Always visible, never overflow */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Cloud Sync Status Icon */}
          <button
            onClick={handleManualCloudSync}
            disabled={isSyncingCloud}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isSyncingCloud 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:text-emerald-500'
            }`}
            title="Sincronizar datos con la nube"
            aria-label="Sincronizar con la nube"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* User Profile / Account Quick Button */}
          {session ? (
            <button
              onClick={() => setIsUserAccountModalOpen(true)}
              className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 active:scale-95 text-xs font-bold transition-all shadow-xs"
              title={`Cuenta activa: ${session.name}. Toca para cambiar o salir`}
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white text-[10px] font-black flex items-center justify-center">
                {session.name.substring(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[65px] truncate text-[11px] font-bold">
                {session.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenAuth('login')}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>
          )}

          {/* Mobile Menu Button - Prominent & High Contrast */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 active:scale-95 shadow-xs"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-[11px] font-bold">Menú</span>
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border-b border-slate-200 dark:border-slate-800 custom-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FinanFlowLogo size="sm" />
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">FinanFlow AI</span>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">Gestor Financiero Inteligente</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent User Session & Account Actions Card */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 rounded-2xl border border-indigo-100 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    {session ? session.name.substring(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {session ? session.name : 'Modo Invitado'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {session ? session.email : 'Sin cuenta activa'}
                    </p>
                  </div>
                </div>

                {session ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsUserAccountModalOpen(true);
                    }}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    Detalles
                  </button>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    Invitado
                  </span>
                )}
              </div>

              {/* Action Buttons: Cambiar de Usuario, Salir de la Cuenta, o Ingresar */}
              {session ? (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenAuth('switch');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Cambiar Usuario</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Salir de Cuenta</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenAuth('login');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Iniciar Sesión</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenAuth('register');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Crear Cuenta</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Capture Action Buttons */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Captura Rápida IA
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => {
                    setIsOCRModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[9px] font-bold truncate w-full">Ticket</span>
                </button>
                <button
                  onClick={() => {
                    setIsVoiceModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-[9px] font-bold truncate w-full">Voz</span>
                </button>
                <button
                  onClick={() => {
                    setIsSMSModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[9px] font-bold truncate w-full">SMS</span>
                </button>
                <button
                  onClick={() => {
                    setIsGmailModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-[9px] font-bold truncate w-full">Gmail</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Secciones
              </p>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {item.highlight && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                        GEMINI
                      </span>
                    )}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsImportExportModalOpen(true);
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Importar / Exportar</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenNewTx();
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Movimiento</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsDeviceSyncModalOpen(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verificar Sincronización ({transactions.length.toLocaleString('es-CO')} tx)</span>
              </button>

              <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Nube Conectada
                </span>
                <button
                  onClick={handleToggleTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                >
                  {settings.theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Modo Oscuro</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigateTo('privacy');
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors cursor-pointer"
                  >
                    Privacidad
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigateTo('terms');
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 underline transition-colors cursor-pointer"
                  >
                    Términos
                  </button>
                </div>
                <a
                  href="https://insights.com.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] font-semibold text-[#0072CE] dark:text-[#38a3f8] hover:underline"
                >
                  Insights Solutions SAS • insights.com.co ↗
                </a>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 3. MAIN CONTENT VIEW */}
      <main className="flex-1 flex flex-col min-w-0 w-full md:h-screen md:overflow-y-auto overflow-x-hidden pb-24 md:pb-6">
        {/* PWA Native Installation Bar */}
        <PWAInstallBanner />

        {/* Desktop Top Header with Global Search & Stats */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* App Version Tag */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700" title={`FinanFlow Build Date: ${BUILD_DATE}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{APP_VERSION}</span>
            </div>

            {/* Insights Solutions Corporate Tag */}
            <a
              href="https://insights.com.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#0072CE] dark:hover:text-[#38a3f8] border border-slate-200/80 dark:border-slate-700 transition-colors"
            >
              <InsightsIcon className="w-4 h-auto" />
              <span>insights.com.co</span>
            </a>

            {/* Cloud Sync Status & Manual Trigger */}
            <button
              onClick={handleManualCloudSync}
              disabled={isSyncingCloud}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer shadow-sm"
              title="Haz clic para sincronizar ahora con tu celular y la nube"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronización Nube'}</span>
            </button>

            {/* Total Transactions & Device Sync Verification Badge */}
            <button
              onClick={() => setIsDeviceSyncModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-850 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer border border-slate-700 active:scale-95"
              title="Comprobar si el celular y la PC tienen exactamente las mismas transacciones sincronizadas"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Totalidad: <strong className="font-mono text-emerald-300">{transactions.length.toLocaleString('es-CO')}</strong> tx</span>
            </button>

            {/* User Account / Profile Button in Desktop Header */}
            {session ? (
              <button
                onClick={() => setIsUserAccountModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer shadow-xs active:scale-95"
                title={`Cuenta: ${session.name} (${session.email})`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white text-[10px] font-black flex items-center justify-center">
                  {session.name.substring(0, 1).toUpperCase()}
                </div>
                <span>{session.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}

            {/* Currency Pill */}
            <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              Moneda: {settings.currency} ({settings.currencySymbol})
            </div>

            {/* Quick Export Modal Button */}
            <button
              onClick={() => setIsImportExportModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Exportar
            </button>

            {/* Quick Reset / Clean Sample Data Button */}
            <button
              onClick={handleClearAllData}
              className="px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5 border border-red-200 dark:border-red-800/80 cursor-pointer"
              title="Borrar datos de prueba e iniciar con cuentas en $0"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Limpiar Datos de Muestra</span>
            </button>
          </div>
        </header>

        {/* View Content Area */}
        <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              bills={bills}
              settings={settings}
              onOpenNewTransaction={handleOpenNewTx}
              onEditTransaction={handleEditTx}
              onOpenOCR={() => setIsOCRModalOpen(true)}
              onOpenVoice={() => setIsVoiceModalOpen(true)}
              onOpenSMS={() => setIsSMSModalOpen(true)}
              onOpenGmail={() => setIsGmailModalOpen(true)}
              onOpenBankStatement={() => setIsBankStatementModalOpen(true)}
              onNavigateToTransactions={handleNavigateToTransactions}
              onNavigateToBudgets={() => setActiveTab('budgets')}
              onNavigateToBills={() => setActiveTab('bills')}
              onNavigateToAdvisor={() => setActiveTab('advisor')}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              settings={settings}
              initialTagFilter={initialTagFilter}
              onOpenNewTransaction={handleOpenNewTx}
              onEditTransaction={handleEditTx}
              onOpenExport={() => setIsImportExportModalOpen(true)}
              onOpenBankStatement={() => setIsBankStatementModalOpen(true)}
              onOpenSyncVerify={() => setIsDeviceSyncModalOpen(true)}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsCategoriesView
              categories={categories}
              accounts={accounts}
              transactions={transactions}
              settings={settings}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'bills' && (
            <BillsRemindersView
              bills={bills}
              categories={categories}
              accounts={accounts}
              settings={settings}
              transactions={transactions}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'advisor' && (
            <AIAdvisorView
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(updated) => setSettings(updated)}
              onRefreshAllData={refreshAllData}
              onOpenGmailScanner={() => setIsGmailModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* 4. MOBILE BOTTOM FIXED NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-2 py-1.5 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex items-center justify-around">
        {/* Inicio */}
        <button
          onClick={() => {
            setActiveTab('dashboard');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </button>

        {/* Movimientos */}
        <button
          onClick={() => {
            setActiveTab('transactions');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'transactions'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Movimientos</span>
          <span className="absolute -top-0.5 right-1 px-1 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold">
            {transactions.length > 999 ? `${Math.floor(transactions.length / 1000)}k` : transactions.length}
          </span>
        </button>

        {/* Floating Quick Action Center Button */}
        <button
          onClick={handleOpenNewTx}
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 active:scale-95 -mt-4 border-2 border-white dark:border-slate-900 cursor-pointer"
          title="Nuevo Movimiento"
          aria-label="Registrar nuevo movimiento"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Presupuestos */}
        <button
          onClick={() => {
            setActiveTab('budgets');
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'budgets'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Presupuesto</span>
        </button>

        {/* Menú y Cuenta */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            mobileMenuOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Abrir Menú"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {session && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-bold">Menú</span>
        </button>
      </nav>

      {/* 5. MODALS CONTAINER */}
      <OCRScannerModal
        isOpen={isOCRModalOpen}
        onClose={() => {
          setIsOCRModalOpen(false);
          setSharedImageBlob(null);
        }}
        initialImageBlob={sharedImageBlob}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
      />

      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
      />

      <SmartParserModal
        isOpen={isSMSModalOpen}
        onClose={() => {
          setIsSMSModalOpen(false);
          setSmsPrefilledText('');
        }}
        initialText={smsPrefilledText}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
      />

      {/* Real-time Clipboard Smart Detector for Instant 1-Touch Capture */}
      <ClipboardQuickDetector
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
        onOpenManualModal={(text) => {
          setSmsPrefilledText(text || '');
          setIsSMSModalOpen(true);
        }}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        transactionToEdit={editingTransaction}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
        onOpenOCR={() => setIsOCRModalOpen(true)}
        onOpenVoice={() => setIsVoiceModalOpen(true)}
        onOpenSMS={() => setIsSMSModalOpen(true)}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        settings={settings}
        aiAdvice={aiAdvice}
        onRefresh={refreshAllData}
      />

      {/* Gmail Invoice & Receipt AI Scanner Modal */}
      <GmailInvoiceScannerModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        categories={categories}
        accounts={accounts}
        settings={settings}
        onSuccess={refreshAllData}
      />

      {/* Bank Statement AI Extractor & Reconciler Modal */}
      <BankStatementExtractorModal
        isOpen={isBankStatementModalOpen}
        onClose={() => setIsBankStatementModalOpen(false)}
        categories={categories}
        accounts={accounts}
        existingTransactions={transactions}
        settings={settings}
        onSuccess={refreshAllData}
      />

      {/* Multi-Device Totality & Sync Verification Modal */}
      <DeviceSyncVerifyModal
        isOpen={isDeviceSyncModalOpen}
        onClose={() => setIsDeviceSyncModalOpen(false)}
        localTransactions={transactions}
        accounts={accounts}
        bills={bills}
        settings={settings}
        onRefreshData={refreshAllData}
      />

      {/* User Account & Profile Sheet/Modal */}
      <UserAccountModal
        isOpen={isUserAccountModalOpen}
        onClose={() => setIsUserAccountModalOpen(false)}
        session={session}
        settings={settings}
        transactionCount={transactions.length}
        onSwitchUser={() => handleOpenAuth('switch')}
        onLoginAnother={() => handleOpenAuth('login')}
        onRegisterNew={() => handleOpenAuth('register')}
        onLogout={handleLogout}
        onOpenSyncVerify={() => setIsDeviceSyncModalOpen(true)}
        onSelectUserToLogin={(u) => {
          loginUser({ email: u.email, password: u.passwordHash || '1234' }).then((res) => {
            if (res.session) {
              handleAuthSuccess(res.session);
            }
          });
        }}
      />

      {/* Auth Modal (Login / Register / Switch Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        allowClose={!!session}
        initialMode={authModalMode}
      />

      {/* Floating Sync Toast */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/50 text-xs font-semibold">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{syncToast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
