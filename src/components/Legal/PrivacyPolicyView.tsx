import React from 'react';
import { ShieldCheck, Lock, Mail, ArrowLeft, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { FinanFlowLogo } from '../FinanFlowLogo';
import { InsightsLogo } from '../InsightsLogo';

interface PrivacyPolicyViewProps {
  onBack?: () => void;
  onNavigateToTerms?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onBack,
  onNavigateToTerms,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FinanFlowLogo className="h-8 w-auto" />
            <span className="text-xs font-bold text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Política de Privacidad
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToTerms && (
              <button
                type="button"
                onClick={onNavigateToTerms}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Términos y Condiciones</span>
              </button>
            )}

            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a FinanFlow</span>
              </button>
            ) : (
              <a
                href="/"
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ir al Inicio</span>
              </a>
            )}
          </div>
        </div>

        {/* Header Title */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Protección de Datos & Cumplimiento Legal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Política de Privacidad de FinanFlow
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>Última actualización:</strong> 1 de septiembre de 2026<br />
            <strong>Responsable del Tratamiento:</strong> Insights Solutions S.A.S. (Colombia)<br />
            <strong>Sitio web oficial:</strong>{' '}
            <a
              href="https://finanflow.insights.com.co"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              https://finanflow.insights.com.co
            </a>
          </p>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              En FinanFlow, la privacidad y confidencialidad de tu información financiera son nuestra máxima prioridad. 
              No comercializamos ni vendemos tus datos a terceros bajo ninguna circunstancia.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">1</span>
              Responsable del Tratamiento de los Datos
            </h2>
            <p>
              La plataforma <strong>FinanFlow</strong> es desarrollada y operada por <strong>Insights Solutions S.A.S.</strong>, sociedad legalmente constituida en la República de Colombia, identificada con domicilio principal en Colombia y portal web corporativo en{' '}
              <a href="https://insights.com.co" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">
                insights.com.co
              </a>.
            </p>
            <p>
              Para cualquier solicitud, consulta o ejercicio de derechos de protección de datos personales (Habeas Data), puedes comunicarte a través del correo electrónico:{' '}
              <a href="mailto:soporte@insights.com.co" className="font-semibold text-indigo-600 dark:text-indigo-400">
                soporte@insights.com.co
              </a>{' '}
              o{' '}
              <a href="mailto:cguilleo@gmail.com" className="font-semibold text-indigo-600 dark:text-indigo-400">
                cguilleo@gmail.com
              </a>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">2</span>
              Información que Recopilamos
            </h2>
            <p>
              FinanFlow recopila únicamente los datos estrictamente necesarios para brindarte el servicio de control y optimización financiera:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre completo, dirección de correo electrónico y preferencias de configuración regional (moneda, tema).</li>
              <li><strong>Datos Financieros Registrados por el Usuario:</strong> Registro de cuentas bancarias (nombre de la entidad, saldo actual), transacciones de ingresos y gastos, presupuestos asignados por categoría y facturas programadas.</li>
              <li><strong>Datos de Archivos Subidos / Escaneados:</strong> Comprobantes, facturas electrónicas o extractos en formatos CSV o imágenes que el usuario decida escanear mediante OCR o procesar voluntariamente.</li>
            </ul>
          </section>

          {/* Section 3 - Google API Limited Use Disclosure */}
          <section className="space-y-3 p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70">
            <h2 className="text-lg font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-extrabold">3</span>
              Uso de la API de Google / Gmail (Declaración de Uso Limitado)
            </h2>
            <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 font-medium">
              FinanFlow incluye una funcionalidad opcional para escanear facturas y recibos electrónicos desde tu cuenta de Gmail (alcance: <code className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300">gmail.readonly</code>).
            </p>
            <div className="space-y-2 text-xs text-indigo-950 dark:text-indigo-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Acceso Estrictamente de Solo Lectura:</strong> FinanFlow solo consulta mensajes que coincidan con términos de facturación electrónica o recibos de servicios para extraer montos, fechas y comercios. Nunca enviamos correos ni modificamos tu bandeja de entrada.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Transferencia a Terceros:</strong> La información obtenida a través de las APIs de Google no se comparte, no se vende ni se transfiere a terceros con fines publicitarios o de telemercadeo.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Entrenamiento de Modelos Públicos:</strong> Los datos obtenidos a través de la integración de Gmail no se utilizan para entrenar modelos de lenguaje generalistas ni se divulgan a terceros.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cumplimiento con Google API Services User Data Policy:</strong> El uso y la transferencia de información recibida de las APIs de Google por parte de FinanFlow cumplen rigurosamente con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700 dark:text-indigo-300">Política de Datos de Usuario de los Servicios de API de Google</a>, incluidos los requisitos de Uso Limitado (Limited Use).</span>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">4</span>
              Finalidades del Tratamiento
            </h2>
            <p>Los datos suministrados se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Permitir el registro, autenticación y gestión de sesiones privadas del usuario.</li>
              <li>Generar gráficos, presupuestos, análisis de flujo de caja y proyecciones financieras personalizadas.</li>
              <li>Ofrecer diagnósticos financieros inteligentes generados mediante Inteligencia Artificial (Gemini).</li>
              <li>Recordar fechas de vencimiento de facturas y obligaciones recurrentes.</li>
              <li>Sincronizar tus datos de forma cifrada entre tus diferentes dispositivos (computador, tablet y teléfono celular).</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">5</span>
              Seguridad y Almacenamiento
            </h2>
            <p>
              Implementamos rigurosos estándares técnicos y organizativos para proteger tus datos:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Cifrado en Tránsito y en Reposo:</strong> Todas las conexiones se realizan bajo protocolo seguro HTTPS con cifrado TLS/SSL.</li>
              <li><strong>Almacenamiento Seguro en la Nube (Google Cloud / Firebase):</strong> Los datos se almacenan en infraestructura de Google Cloud Platform con reglas de seguridad estrictas que aíslan cada registro por identificador único de usuario.</li>
              <li><strong>Persistencia Local (Local-First):</strong> Puedes utilizar la herramienta en modo fuera de línea con almacenamiento local seguro en tu navegador.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">6</span>
              Tus Derechos (Habeas Data y Eliminación de Datos)
            </h2>
            <p>
              De conformidad con la Ley 1581 de 2012 y normativas internacionales de protección de datos, como titular tienes derecho a:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Acceder y Consultar:</strong> Conocer todos tus datos personales recopilados en cualquier momento.</li>
              <li><strong>Actualizar y Rectificar:</strong> Corregir información inexacta o incompleta.</li>
              <li><strong>Eliminación Total (Derecho al Olvido):</strong> Puedes pulsar en cualquier momento el botón <em>"Limpiar Datos"</em> o <em>"Vaciar Historial"</em> en la configuración de FinanFlow, o solicitar por correo la eliminación inmediata y definitiva de tu cuenta y todos los registros asociados en los servidores de la nube.</li>
              <li><strong>Revocar Autorizaciones:</strong> Revocar en cualquier momento los permisos de acceso de Google o de la aplicación.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">7</span>
              Modificaciones a esta Política
            </h2>
            <p>
              Insights Solutions S.A.S. se reserva el derecho de actualizar esta Política de Privacidad para adaptarla a mejoras en el servicio o requisitos legales. Cualquier cambio sustancial será notificado a través de la aplicación web o publicado en esta misma URL.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">8</span>
              Canales de Atención y Contacto
            </h2>
            <p>
              Para cualquier inquietud sobre esta política o el tratamiento de tus datos personales, puedes contactarnos en:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-xs space-y-1.5">
              <p><strong>Razón Social:</strong> Insights Solutions S.A.S.</p>
              <p><strong>Correo de soporte:</strong> <a href="mailto:soporte@insights.com.co" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">soporte@insights.com.co</a> / <a href="mailto:cguilleo@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">cguilleo@gmail.com</a></p>
              <p><strong>Sitio Web:</strong> <a href="https://insights.com.co" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">https://insights.com.co</a></p>
              <p><strong>Ubicación:</strong> Colombia</p>
            </div>
          </section>
        </div>

        {/* Corporate Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <InsightsLogo className="h-4 w-auto" />
            <span>• FinanFlow es un producto tecnológico de Insights Solutions S.A.S.</span>
          </div>
          <p>© {new Date().getFullYear()} Insights Solutions S.A.S. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};
