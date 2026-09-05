import React from 'react';
import {
  X,
  User,
  Users,
  LogOut,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Cloud,
  Mail,
  KeyRound,
  ArrowRightLeft
} from 'lucide-react';
import { UserSession, UserProfile, UserSettings } from '../../types';
import { getRegisteredUsers } from '../../utils/authStorage';
import { FinanFlowLogo } from '../FinanFlowLogo';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  settings: UserSettings;
  transactionCount: number;
  onSwitchUser: () => void;
  onLoginAnother: () => void;
  onRegisterNew: () => void;
  onLogout: () => void;
  onOpenSyncVerify: () => void;
  onSelectUserToLogin: (user: UserProfile) => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  session,
  settings,
  transactionCount,
  onSwitchUser,
  onLoginAnother,
  onRegisterNew,
  onLogout,
  onOpenSyncVerify,
  onSelectUserToLogin,
}) => {
  if (!isOpen) return null;

  const registeredUsers = getRegisteredUsers();
  const otherUsers = registeredUsers.filter((u) => u.email !== session?.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Mi Cuenta & Perfil
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cambiar de usuario, sincronizar o salir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Active Account Card */}
          {session ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black text-lg flex items-center justify-center shadow-md flex-shrink-0">
                  {session.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {session.name}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {session.email}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                      Nube activa
                    </span>
                    <span>•</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {transactionCount.toLocaleString('es-CO')} tx
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
              <p className="text-xs font-bold">Estás navegando en Modo Invitado (Sin cuenta)</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                Inicia sesión o crea una cuenta para sincronizar automáticamente con tu celular y computador.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onLoginAnother();
                }}
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Iniciar Sesión / Ingresar</span>
              </button>
            </div>
          )}

          {/* Other Registered Accounts on this device */}
          {otherUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Otras Cuentas en este Dispositivo
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {otherUsers.length} perfil(es)
                </span>
              </div>
              <div className="space-y-1.5">
                {otherUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onClose();
                      onSelectUserToLogin(u);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors flex-shrink-0">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                      <span>Cambiar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Actions List */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Opciones de Usuario
            </span>

            {/* Cambiar de Cuenta */}
            <button
              onClick={() => {
                onClose();
                onSwitchUser();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left font-bold text-xs active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">Cambiar de Cuenta / Usuario</p>
                <p className="text-[10px] text-slate-400 font-normal">Alternar entre perfiles registrados</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Iniciar Sesión con Otra Cuenta */}
            <button
              onClick={() => {
                onClose();
                onLoginAnother();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left font-bold text-xs active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">Ingresar con Otra Cuenta</p>
                <p className="text-[10px] text-slate-400 font-normal">Acceder con correo y contraseña</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Registrar Cuenta Nueva */}
            <button
              onClick={() => {
                onClose();
                onRegisterNew();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left font-bold text-xs active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">Crear Cuenta Nueva</p>
                <p className="text-[10px] text-slate-400 font-normal">Crear un nuevo perfil independiente</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Comprobar Sincronización Multi-Dispositivo */}
            <button
              onClick={() => {
                onClose();
                onOpenSyncVerify();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all text-left font-bold text-xs active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">Verificar Sincronización</p>
                <p className="text-[10px] text-slate-400 font-normal">Confirmar totalidad de movimientos con la nube</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Salir de la Cuenta (Logout) */}
          {session && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 font-bold text-xs active:scale-98 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir de la Cuenta (Cerrar Sesión)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
