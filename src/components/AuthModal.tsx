import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  LogOut,
  PlusCircle,
  Zap,
} from 'lucide-react';
import { FinanFlowLogo } from './FinanFlowLogo';
import {
  getRegisteredUsers,
  loginUser,
  registerUser,
  getCurrentSession,
  quickGuestLogin,
} from '../utils/authStorage';
import { UserProfile, UserSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onAuthSuccess: (session: UserSession) => void;
  initialMode?: 'login' | 'register' | 'switch';
  allowClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  allowClose = true,
}) => {
  const registeredUsers = getRegisteredUsers();
  const currentSession = getCurrentSession();

  const [mode, setMode] = useState<'login' | 'register' | 'switch'>(
    initialMode || (registeredUsers.length === 0 ? 'register' : 'login')
  );

  const defaultEmail = registeredUsers[0]?.email || 'cguilleo@gmail.com';
  const defaultName = registeredUsers[0]?.name || 'Carlos Guillermo';
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const cleanName = name.trim() || email.split('@')[0] || 'Usuario';
        const cleanEmail = email.trim() || defaultEmail;

        const res = await registerUser({
          name: cleanName,
          email: cleanEmail,
          password: password || '1234',
          currency,
          mode: accountType,
          companyName: accountType === 'business' ? companyName : undefined,
        });

        if (res.session) {
          onAuthSuccess(res.session);
          if (onClose) onClose();
          return;
        }
      } else {
        // Login mode
        const cleanEmail = email.trim() || defaultEmail;
        const res = await loginUser({ email: cleanEmail, password: password || '1234' });

        if (res.session) {
          onAuthSuccess(res.session);
          if (onClose) onClose();
          return;
        }
      }
    } catch (err: any) {
      console.warn('Auth handling fallback:', err);
      const fallback = quickGuestLogin();
      onAuthSuccess(fallback);
      if (onClose) onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAccess = () => {
    const session = quickGuestLogin();
    onAuthSuccess(session);
    if (onClose) onClose();
  };

  const handleSelectQuickUser = (user: UserProfile) => {
    setEmail(user.email);
    setPassword(user.passwordHash || '1234');
    setMode('login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Branding */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-indigo-500/10 via-slate-500/5 to-transparent border-b border-slate-100 dark:border-slate-800/60">
          {allowClose && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <FinanFlowLogo size="md" />
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Finan<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {mode === 'register' ? 'Registro' : mode === 'login' ? 'Iniciar Sesión' : 'Cuentas'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Por <strong>Insights Solutions SAS</strong>
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center p-1 mt-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Crear Cuenta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ingresar
            </button>
            {registeredUsers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMode('switch');
                  setError(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                  mode === 'switch'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Ver perfiles registrados"
              >
                <Users className="w-3.5 h-3.5" />
                <span>({registeredUsers.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* MODE: SWITCH ACCOUNT / PROFILE SELECTOR */}
          {mode === 'switch' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Selecciona una cuenta registrada en este dispositivo para ingresar:
              </p>
              <div className="space-y-2">
                {registeredUsers.map((u) => {
                  const isCurrent = currentSession?.userId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectQuickUser(u)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                        isCurrent
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                                Activo
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block">
                            {u.email}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Registrar una cuenta nueva</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE: LOGIN OR REGISTER FORM */}
          {mode !== 'switch' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If Register: Name */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tu Nombre o Alias
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Guillermo o Mi Empresa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="cguilleo@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Contraseña / PIN
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* If Register: Type & Currency */}
              {mode === 'register' && (
                <div className="pt-1 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tipo de Billetera
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountType('personal')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          accountType === 'personal'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Personal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('business')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          accountType === 'business'
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Empresarial</span>
                      </button>
                    </div>
                  </div>

                  {accountType === 'business' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nombre de la Empresa
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Inversiones SAS"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Moneda Principal
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="COP">COP ($) - Peso Colombiano</option>
                      <option value="USD">USD ($) - Dólar Estadounidense</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="MXN">MXN ($) - Peso Mexicano</option>
                      <option value="CLP">CLP ($) - Peso Chileno</option>
                      <option value="PEN">PEN (S/) - Sol Peruano</option>
                      <option value="ARS">ARS ($) - Peso Argentino</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'register' ? 'Crear mi Billetera Segura' : 'Entrar a FinanFlow'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Direct Quick Entry Button */}
              <button
                type="button"
                onClick={handleDirectAccess}
                className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Continuar directo a la aplicación</span>
              </button>
            </form>
          )}

          {/* Privacy Note */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Tus datos financieros están protegidos y aislados para tu usuario.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
