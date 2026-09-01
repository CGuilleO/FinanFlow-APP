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
} from 'lucide-react';
import { Account, BillReminder, Category, FinancialHealthAnalysis, Transaction, UserSettings, UserSession } from './types';
import { APP_VERSION, BUILD_DATE } from './version';
import { FinanFlowLogo } from './components/FinanFlowLogo';
import { InsightsIcon, InsightsLogo, InsightsBadge } from './components/InsightsLogo';
import { AuthModal } from './components/AuthModal';
import { getCurrentSession, logoutUser } from './utils/authStorage';
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

// Modals
import { OCRScannerModal } from './components/Modals/OCRScannerModal';
import { VoiceInputModal } from './components/Modals/VoiceInputModal';
import { SmartParserModal } from './components/Modals/SmartParserModal';
import { TransactionModal } from './components/Modals/TransactionModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { ClipboardQuickDetector } from './components/ClipboardQuickDetector';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'advisor' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialTagFilter, setInitialTagFilter] = useState<string | undefined>(undefined);

  // User Auth & Session state
  const [session, setSession] = useState<UserSession | null>(() => getCurrentSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !getCurrentSession());

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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

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

      // 1. If local has records (like on Desktop with 2833 transactions), push to cloud
      if (localTxs.length > 0) {
        await syncCurrentDataToCloud();
      }

      // 2. Fetch from cloud and apply
      const cloudData = await fetchUserCloudData(effectiveId);
      if (cloudData) {
        applyCloudDataLocally(cloudData);
        refreshAllData();
      }

      showSyncToast(`¡Sincronización en la nube completada! (${getStoredTransactions().length} movimientos)`);
    } catch (err) {
      console.error('Error during manual sync:', err);
      showSyncToast('Error de sincronización. Verifica tu conexión.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Subscribe to Cloud Firestore real-time changes across devices
  useEffect(() => {
    refreshAllData();
    const effectiveId = getEffectiveUserId();

    // 1. Initial check: If local has existing transactions (e.g. 2833 on Desktop), sync to cloud
    const localTxs = getStoredTransactions();
    if (localTxs.length > 0) {
      syncCurrentDataToCloud().catch(console.error);
    }

    // 2. Fetch latest from cloud (e.g. for phone receiving data from PC)
    fetchUserCloudData(effectiveId).then((cloudData) => {
      if (cloudData && (cloudData.transactions?.length || cloudData.accounts?.length)) {
        applyCloudDataLocally(cloudData);
        refreshAllData();
      }
    }).catch(console.error);

    // 3. Listen to real-time changes in Firestore
    const unsubCloud = subscribeToUserCloudData(effectiveId, (cloudData) => {
      if (cloudData && (cloudData.transactions !== undefined || cloudData.accounts !== undefined)) {
        applyCloudDataLocally(cloudData);
        refreshAllData();
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
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setIsOCRModalOpen(true)}
              title="Escanear ticket con cámara"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Ticket</span>
            </button>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              title="Dictar por voz"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span className="text-[10px] font-semibold">Voz</span>
            </button>
            <button
              onClick={() => setIsSMSModalOpen(true)}
              title="Leer SMS bancario o factura"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] font-semibold">SMS</span>
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

          {/* Insights Solutions Attribution & App Version */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <InsightsBadge />
            <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>Versión</span>
              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {APP_VERSION}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVBAR */}
      <header className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <FinanFlowLogo size="sm" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Finan<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
              </span>
              <span className="px-1 py-0.2 text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200/80 dark:border-indigo-800">
                AI
              </span>
              <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                {APP_VERSION}
              </span>
            </div>
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap leading-tight">
              por Insights Solutions
            </span>
          </div>
        </div>

        {/* Compact Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme Quick Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:text-amber-500 dark:hover:text-amber-400 transition-all active:scale-95"
            title={settings.theme === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            aria-label="Cambiar tema visual"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={handleManualCloudSync}
            disabled={isSyncingCloud}
            className={`relative p-2 rounded-xl border transition-all active:scale-95 ${
              isSyncingCloud 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' 
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:text-emerald-500 hover:border-emerald-500/40'
            }`}
            title="Sincronizar datos con la nube"
            aria-label="Sincronizar con la nube"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* User Profile Avatar Button */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 p-1 pr-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-500/40 transition-all active:scale-95"
            title={session ? `Sesión: ${session.name} (${session.email})` : 'Iniciar Sesión'}
            aria-label="Perfil de usuario"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
              {session ? session.name.substring(0, 1).toUpperCase() : <User className="w-3 h-3" />}
            </div>
            {session && (
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 max-w-[65px] truncate hidden xs:inline">
                {session.name.split(' ')[0]}
              </span>
            )}
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 dark:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-colors active:scale-95"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Session Profile Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                  {session ? session.name.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {session ? session.name : 'Modo Invitado'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {session ? session.email : 'Sin sincronizar'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {session ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Acceder
                  </button>
                )}
              </div>
            </div>

            {/* Quick Capture Action Buttons */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Captura Rápida IA
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setIsOCRModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Ticket OCR</span>
                </button>
                <button
                  onClick={() => {
                    setIsVoiceModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Dictar Voz</span>
                </button>
                <button
                  onClick={() => {
                    setIsSMSModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-1 text-center"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[10px] font-bold">SMS / Texto</span>
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

              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
                <a
                  href="https://insights.com.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#0072CE] dark:text-[#38a3f8] hover:underline"
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
      <main className="flex-1 flex flex-col min-w-0 w-full md:h-screen md:overflow-y-auto overflow-x-hidden">
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
            />
          )}
        </div>
      </main>

      {/* 4. MODALS CONTAINER */}
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

      {/* Auth Modal (Login / Register / Switch Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        allowClose={!!session}
        initialMode={session ? 'switch' : 'register'}
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
