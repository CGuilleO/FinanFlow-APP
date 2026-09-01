import React from 'react';

interface InsightsIconProps {
  className?: string;
  size?: number;
}

/**
 * Square / Compact Icon "IN" with speed/motion trails
 * Based on Insights Solutions SAS official brand asset
 */
export const InsightsIcon: React.FC<InsightsIconProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 170 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: (size * 100) / 170 } : undefined}
      aria-label="Insights Solutions SAS Icon"
    >
      {/* Motion / Speed Lines on the left */}
      {/* Top trail */}
      <rect x="52" y="12" width="28" height="7" rx="3.5" fill="#0072CE" />
      {/* Upper-mid trail */}
      <rect x="25" y="27" width="55" height="7.5" rx="3.75" fill="#0072CE" />
      {/* Middle long trail */}
      <rect x="8" y="44" width="72" height="8" rx="4" fill="#0072CE" />
      {/* Lower short trail */}
      <rect x="18" y="60" width="16" height="6.5" rx="3.25" fill="#0072CE" />
      {/* Lower-mid trail */}
      <rect x="38" y="60" width="42" height="6.5" rx="3.25" fill="#0072CE" />
      {/* Bottom trail */}
      <rect x="28" y="75" width="52" height="6.5" rx="3.25" fill="#0072CE" />

      {/* Main Blue Badge Container */}
      <rect x="68" y="10" width="94" height="80" rx="16" fill="#0072CE" />

      {/* Letters "IN" inside the badge */}
      {/* Letter 'I' */}
      <rect x="84" y="24" width="13" height="52" rx="3" fill="#FFFFFF" />

      {/* Letter 'N' */}
      <path
        d="M109 24 H121.5 L136.5 61 V24 H148.5 V76 H136.5 L121 38.5 V76 H109 V24 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

interface InsightsLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'light' | 'dark';
  showTagline?: boolean;
}

/**
 * Full Horizontal Logo "IN SIGHTS" with optional Solutions tagline
 */
export const InsightsLogo: React.FC<InsightsLogoProps> = ({
  className = 'h-8',
  variant = 'full',
  showTagline = false,
}) => {
  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        {/* Vector Icon */}
        <InsightsIcon className="h-7 w-auto flex-shrink-0" />

        {/* Text "SIGHTS" */}
        <span className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase font-sans select-none">
          SIGHTS
        </span>
      </div>

      {showTagline && (
        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider pl-1 uppercase">
          Solutions SAS • insights.com.co
        </span>
      )}
    </div>
  );
};

export const InsightsBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <a
      href="https://insights.com.co"
      target="_blank"
      rel="noopener noreferrer"
      title="Visitar Insights Solutions SAS (insights.com.co)"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
    >
      <InsightsIcon className="w-5 h-auto text-indigo-600" />
      <div className="text-left">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Un producto de</span>
          <span className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            Insights SAS
          </span>
        </div>
        {!compact && (
          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium block">
            insights.com.co
          </span>
        )}
      </div>
    </a>
  );
};
