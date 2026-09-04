import React from 'react';
import { FileText, ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, Scale, Globe } from 'lucide-react';
import { FinanFlowLogo } from '../FinanFlowLogo';
import { InsightsLogo } from '../InsightsLogo';

interface TermsOfServiceViewProps {
  onBack?: () => void;
  onNavigateToPrivacy?: () => void;
}

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({
  onBack,
  onNavigateToPrivacy,
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
              Términos y Condiciones de Uso
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToPrivacy && (
              <button
                type="button"
                onClick={onNavigateToPrivacy}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Política de Privacidad</span>
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
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Condiciones Contractuales del Servicio</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Términos y Condiciones de Uso de FinanFlow
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>Última actualización:</strong> 1 de septiembre de 2026<br />
            <strong>Titular del Software y Servicio:</strong> Insights Solutions S.A.S.<br />
            <strong>Portal oficial:</strong>{' '}
            <a
              href="https://finanflow.insights.com.co"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              https://finanflow.insights.com.co
            </a>
          </p>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Bienvenido a <strong>FinanFlow</strong>. Al acceder, registrarte o utilizar nuestra plataforma web, aplicación progresiva (PWA) o cualquiera de sus servicios asociados, aceptas someterte de manera vinculante a los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, debes abstenerte de utilizar la plataforma.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">1</span>
              Naturaleza y Objeto del Servicio
            </h2>
            <p>
              <strong>FinanFlow</strong> es una solución de software inteligente diseñada para facilitar la administración financiera personal y de pequeñas y medianas empresas (PyMEs). La plataforma proporciona herramientas para:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>El registro y clasificación de ingresos, egresos y transferencias entre cuentas.</li>
              <li>La fijación y monitoreo de presupuestos mensuales por categoría de gasto.</li>
              <li>La programación y seguimiento de facturas, servicios públicos y obligaciones recurrentes.</li>
              <li>El análisis de salud financiera y sugerencias de ahorro optimizadas mediante algoritmos de Inteligencia Artificial (Gemini).</li>
              <li>La lectura y digitalización automática de comprobantes y facturas electrónicas a través de OCR y sincronización de Gmail autorizada por el usuario.</li>
            </ul>
          </section>

          {/* Section 2 - Financial & Accounting Disclaimer */}
          <section className="space-y-3 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-200">
            <h2 className="text-lg font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>2. Descargo de Responsabilidad Financiera y Tributaria</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium leading-relaxed">
              Los diagnósticos, proyecciones, categorizaciones y recomendaciones generadas por el <strong>Asesor Financiero con Inteligencia Artificial</strong> de FinanFlow tienen un carácter estrictamente <strong>informativo, pedagógico y de apoyo a la toma de decisiones</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>FinanFlow <strong>no es una entidad financiera, fiduciaria ni asesor contable o tributario certificado</strong>.</li>
              <li>El usuario es el único y exclusivo responsable de sus decisiones de inversión, endeudamiento, ahorro, declaraciones de impuestos y compromisos contractuales.</li>
              <li>Recomendamos validar cualquier decisión contable o fiscal de gran impacto con un profesional contable o asesor tributario matriculado.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">3</span>
              Registro, Cuentas y Seguridad de las Credenciales
            </h2>
            <p>
              Para utilizar ciertas funcionalidades, el usuario crea un perfil o inicia sesión mediante su cuenta de correo electrónico o autenticación de Google. El usuario se compromete a:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Proporcionar información veraz y mantenerla actualizada.</li>
              <li>Mantener la estricta confidencialidad de sus credenciales de acceso y dispositivos habilitados.</li>
              <li>Notificar oportunamente a Insights Solutions S.A.S. en caso de sospecha de acceso no autorizado a su cuenta.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">4</span>
              Propiedad Intelectual
            </h2>
            <p>
              Todo el software, código fuente, algoritmos, diseños de interfaz, logotipos, marcas comerciales, bases de datos y contenidos que componen <strong>FinanFlow</strong> son propiedad exclusiva de <strong>Insights Solutions S.A.S.</strong> o se encuentran debidamente licenciados.
            </p>
            <p>
              Se concede al usuario una licencia limitada, personal, no transferible y no exclusiva para hacer uso de la aplicación conforme a su propósito previsto. Queda prohibida la descompilación, ingeniería inversa, copia o explotación comercial no autorizada del software.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">5</span>
              Integraciones de Terceros (Google Workspace y Nube)
            </h2>
            <p>
              FinanFlow interactúa con servicios provistos por terceros como Google Cloud Platform y Google Identity Services para funciones de sincronización y lectura de comprobantes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>El uso de funciones de integración con Google está sujeto a los términos y directrices de uso de Google.</li>
              <li>Insights Solutions S.A.S. no se hace responsable por interrupciones temporales o cambios en las políticas de APIs provistas por terceros fuera de su control razonable.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">6</span>
              Uso Prohibido
            </h2>
            <p>El usuario se obliga a NO emplear la plataforma para:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Introducir virus, troyanos, scripts maliciosos o ataques de denegación de servicio.</li>
              <li>Intentar eludir las medidas de autenticación, cortafuegos o restricciones de seguridad de la infraestructura.</li>
              <li>Realizar actividades fraudulentas, lavado de activos o vulneración de derechos de terceros.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">7</span>
              Disponibilidad, Mantenimiento y Garantías
            </h2>
            <p>
              Insights Solutions S.A.S. implementa las mejores prácticas para asegurar la máxima disponibilidad del servicio. No obstante, el servicio se provee "tal cual" y "según disponibilidad". No podemos garantizar que la plataforma operará de forma ininterrumpida o libre de todo error en situaciones de mantenimiento programado o fallas en las redes globales de telecomunicaciones.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">8</span>
              Ley Aplicable y Resolución de Controversias
            </h2>
            <p>
              Estos Términos y Condiciones se rigen e interpretan de acuerdo con las <strong>leyes de la República de Colombia</strong>. Cualquier controversia, reclamo o desacuerdo derivado del uso del servicio se someterá preferentemente a un mecanismo directo de conciliación amigable entre las partes antes de acudir a la jurisdicción ordinaria competente en Colombia.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold">9</span>
              Contacto y Notificaciones
            </h2>
            <p>
              Si tienes preguntas sobre estos Términos y Condiciones, contáctanos a través de:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 text-xs space-y-1.5">
              <p><strong>Empresa:</strong> Insights Solutions S.A.S.</p>
              <p><strong>Email:</strong> <a href="mailto:soporte@insights.com.co" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">soporte@insights.com.co</a></p>
              <p><strong>Sitio Web:</strong> <a href="https://insights.com.co" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">https://insights.com.co</a></p>
              <p><strong>País:</strong> Colombia</p>
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
