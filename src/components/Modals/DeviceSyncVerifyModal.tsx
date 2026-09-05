import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Cloud, 
  Smartphone, 
  Monitor, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  ShieldCheck, 
  Layers, 
  ReceiptText,
  Clock
} from 'lucide-react';
import { Transaction, Account, BillReminder, SavingsGoal, UserSettings } from '../../types';
import { 
  getStoredTransactions, 
  getStoredAccounts, 
  getStoredBills, 
  getStoredGoals,
  getEffectiveUserId, 
  syncCurrentDataToCloud, 
  applyCloudDataLocally,
  formatCurrency, 
  formatDate 
} from '../../utils/storage';
import { fetchUserCloudData } from '../../lib/firebase';

interface DeviceSyncVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  localTransactions: Transaction[];
  accounts: Account[];
  bills: BillReminder[];
  goals?: SavingsGoal[];
  settings: UserSettings;
  onRefreshData: () => void;
}

interface ServerSyncStatus {
  transactionCount: number;
  accountsCount: number;
  billsCount: number;
  updatedAt: string | null;
  updatedByDevice: string | null;
}

export const DeviceSyncVerifyModal: React.FC<DeviceSyncVerifyModalProps> = ({
  isOpen,
  onClose,
  localTransactions,
  accounts,
  bills,
  goals,
  settings,
  onRefreshData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerSyncStatus | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const localDeviceName = isMobile ? 'Teléfono Móvil' : 'Computador / Escritorio';

  const checkSyncStatus = async () => {
    setIsLoading(true);
    setActionSuccess(null);
    try {
      const effectiveId = getEffectiveUserId();
      const res = await fetch(`/api/sync/status?userId=${encodeURIComponent(effectiveId)}`);
      if (res.ok) {
        const json = await res.json();
        setServerStatus({
          transactionCount: json.transactionCount ?? 0,
          accountsCount: json.accountsCount ?? 0,
          billsCount: json.billsCount ?? 0,
          updatedAt: json.updatedAt ?? null,
          updatedByDevice: json.updatedByDevice ?? 'Servidor Nube',
        });
      } else {
        // Fallback to direct cloud data
        const cloudData = await fetchUserCloudData(effectiveId);
        if (cloudData) {
          setServerStatus({
            transactionCount: cloudData.transactions?.length ?? 0,
            accountsCount: cloudData.accounts?.length ?? 0,
            billsCount: cloudData.bills?.length ?? 0,
            updatedAt: (cloudData as any).updatedAt ?? null,
            updatedByDevice: (cloudData as any).updatedByDevice ?? 'Nube',
          });
        }
      }
      setLastCheckedAt(new Date());
    } catch (err) {
      console.error('Error checking sync status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkSyncStatus();
    }
  }, [isOpen]);

  const handlePullFromCloud = async () => {
    setIsLoading(true);
    setActionSuccess(null);
    try {
      const effectiveId = getEffectiveUserId();
      const cloudData = await fetchUserCloudData(effectiveId);
      if (cloudData && cloudData.transactions) {
        applyCloudDataLocally(cloudData);
        onRefreshData();
        setActionSuccess(`¡Éxito! Se descargaron y sincronizaron ${cloudData.transactions.length.toLocaleString('es-CO')} movimientos desde la nube.`);
        await checkSyncStatus();
      } else {
        alert('No se encontraron datos en el servidor para restaurar.');
      }
    } catch (e: any) {
      alert('Error al descargar datos de la nube: ' + (e?.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToCloud = async () => {
    setIsLoading(true);
    setActionSuccess(null);
    try {
      const success = await syncCurrentDataToCloud();
      if (success) {
        setActionSuccess(`¡Éxito! Se subieron ${localTransactions.length.toLocaleString('es-CO')} movimientos a la nube.`);
        await checkSyncStatus();
      } else {
        alert('No se pudo completar la subida. Verifica tu conexión.');
      }
    } catch (e: any) {
      alert('Error al subir datos a la nube: ' + (e?.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const localCount = localTransactions.length;
  const cloudCount = serverStatus?.transactionCount ?? 0;
  const isIdentical = serverStatus ? localCount === cloudCount : false;
  const diff = Math.abs(localCount - cloudCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Verificador de Sincronización Multi-Dispositivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compara en tiempo real la totalidad de movimientos en este equipo y en la Nube
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

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Sync Status Banner */}
          {serverStatus ? (
            isIdentical ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                    Sincronización 100% Exitosa e Idéntica
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Ambos lados contienen exactamente <strong>{localCount.toLocaleString('es-CO')} movimientos</strong>. Tu información está perfectamente unificada en todos tus dispositivos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">
                    Hay {diff.toLocaleString('es-CO')} movimiento(s) de diferencia
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    {localCount > cloudCount
                      ? `Este dispositivo tiene ${localCount.toLocaleString('es-CO')} y la nube tiene ${cloudCount.toLocaleString('es-CO')}. Te recomendamos pulsar "Subir a la Nube" para actualizar el servidor.`
                      : `La nube tiene ${cloudCount.toLocaleString('es-CO')} y este dispositivo tiene ${localCount.toLocaleString('es-CO')}. Pulsa "Descargar desde la Nube" para unificar.`}
                  </p>
                </div>
              </div>
            )
          ) : null}

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local Device Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isMobile ? <Smartphone className="w-4 h-4 text-indigo-500" /> : <Monitor className="w-4 h-4 text-indigo-500" />}
                  <span>Este Dispositivo ({localDeviceName})</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  En uso ahora
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Totalidad de Movimientos:</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {localCount.toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                  <span>Cuentas activas:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{accounts.length}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                  <span>Facturas / Préstamos:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{bills.length}</span>
                </div>
              </div>
            </div>

            {/* Cloud Server Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Cloud className="w-4 h-4 text-emerald-500" />
                  <span>Servidor Central / Nube</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Respaldo Permanente
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Totalidad en la Nube:</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {serverStatus ? cloudCount.toLocaleString('es-CO') : '...'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                  <span>Último dispositivo:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">
                    {serverStatus?.updatedByDevice || 'Nube'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                  <span>Fecha última sync:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-200">
                    {serverStatus?.updatedAt ? formatDate(serverStatus.updatedAt) : 'Registrado'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Acciones de Sincronización Manual
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handlePullFromCloud}
                disabled={isLoading}
                className="w-full px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowDownToLine className="w-4 h-4 text-indigo-500" />
                <span>Descargar Totalidad de la Nube</span>
              </button>

              <button
                onClick={handlePushToCloud}
                disabled={isLoading}
                className="w-full px-4 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowUpToLine className="w-4 h-4" />
                <span>Subir y Guardar en la Nube</span>
              </button>
            </div>
          </div>

          {/* Timestamp Notice */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Última verificación: {lastCheckedAt.toLocaleTimeString('es-CO')}
            </span>
            <button
              onClick={checkSyncStatus}
              disabled={isLoading}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Comprobar de nuevo
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
