import React from 'react';

interface FinanFlowLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Modern High-Contrast AI Smart Wallet Logo for FinanFlow
 * Designed with vivid gradients, high luminosity, sharp highlights,
 * and high-contrast vector elements so details are crisp and clear on any background.
 */
export const FinanFlowLogo: React.FC<FinanFlowLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-3xl',
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center p-1 bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-[1.5px] shadow-md shadow-indigo-500/25 group hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 ${sizeMap} ${className}`}
      title="FinanFlow AI Wallet"
    >
      {/* Inner vibrant container with high-contrast depth */}
      <div className="w-full h-full rounded-[inherit] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center p-1 overflow-hidden relative">
        {/* Subtle interior luminous back-glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/30 via-indigo-500/20 to-amber-500/20 rounded-[inherit] pointer-events-none" />

        {/* High-Tech Vector AI Wallet SVG */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          <defs>
            {/* Primary Wallet Gradient - Vibrant Deep Royal to Electric Indigo */}
            <linearGradient id="ffWalletGrad" x1="10" y1="25" x2="90" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            {/* AI Clasp Flap Gradient - Bright Electric Cyan to Azure */}
            <linearGradient id="ffFlapGrad" x1="35" y1="40" x2="92" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="60%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>

            {/* Back Card Gradient - Emerald/Mint for growth */}
            <linearGradient id="ffCardBackGrad" x1="20" y1="12" x2="70" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Front Card Gradient - Cyan/White High-Tech Card */}
            <linearGradient id="ffCardFrontGrad" x1="26" y1="18" x2="80" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Gold Sparkle Core Gradient */}
            <linearGradient id="ffGoldSpark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="ffGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Protruding Smart Card 1 (Emerald Growth Card in back) */}
          <path
            d="M20 22C20 17.5 23.5 14 28 14H66C70.5 14 74 17.5 74 22V28H20V22Z"
            fill="url(#ffCardBackGrad)"
            stroke="#6EE7B7"
            strokeWidth="1.2"
          />
          {/* Card 1 Mini Chip Accent */}
          <rect x="26" y="18" width="8" height="5" rx="1.5" fill="#FEF08A" />

          {/* 2. Protruding Smart Card 2 (Vibrant Cyan / Platinum Card) */}
          <path
            d="M26 27C26 22 30 18 35 18H77C82 18 86 22 86 27V36H26V27Z"
            fill="url(#ffCardFrontGrad)"
            stroke="#E0F2FE"
            strokeWidth="1.2"
          />
          {/* Holographic Chip / Security Stripe */}
          <line x1="33" y1="24" x2="52" y2="24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="76" cy="24" r="3" fill="#FFFFFF" opacity="0.9" />

          {/* 3. Main Smart Wallet Body (Bold Vibrant Silhouette with high contrast rim) */}
          <rect
            x="12"
            y="30"
            width="76"
            height="54"
            rx="14"
            fill="url(#ffWalletGrad)"
            stroke="#93C5FD"
            strokeWidth="2"
          />

          {/* Top highlight glare on wallet rim */}
          <path
            d="M16 33C16 32 20 31.5 28 31.5H72C80 31.5 84 32 84 33"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* 4. Neural / Financial Flow Streamlines (Bright Neon Cyan & Amber) */}
          <path
            d="M18 46C30 46 36 54 48 54C60 54 66 48 76 48"
            stroke="#67E8F9"
            strokeWidth="2"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />
          <path
            d="M18 66C32 66 38 72 54 72C66 72 72 65 78 65"
            stroke="#C084FC"
            strokeWidth="2"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />

          {/* 5. Asymmetrical Smart Flap (Metallic Cyan with sharp bevel) */}
          <path
            d="M44 42H86C89.3 42 92 44.7 92 48V66C92 69.3 89.3 72 86 72H44C38 72 34 67.5 34 61.5V52.5C34 46.5 38 42 44 42Z"
            fill="url(#ffFlapGrad)"
            stroke="#BAE6FD"
            strokeWidth="1.8"
          />

          {/* Top gloss line on flap */}
          <path
            d="M46 44H84"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* 6. Biometric AI Core Ring */}
          <circle
            cx="72"
            cy="57"
            r="8.5"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="2"
          />
          {/* Inner pulsating ring */}
          <circle
            cx="72"
            cy="57"
            r="6"
            stroke="#818CF8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* 7. Radiant Golden 4-Point AI Sparkle in Core */}
          <path
            d="M72 50.5C72 54 74 55.5 77.5 55.5C74 55.5 72 57 72 60.5C72 57 70 55.5 66.5 55.5C70 55.5 72 54 72 50.5Z"
            fill="url(#ffGoldSpark)"
            filter="url(#ffGlow)"
          />

          {/* 8. Extra Floating AI Super-Spark (Top Right) */}
          <path
            d="M87 14C87 16.5 88.5 17.5 91 17.5C88.5 17.5 87 18.5 87 21C87 18.5 85.5 17.5 83 17.5C85.5 17.5 87 16.5 87 14Z"
            fill="#FDE047"
            filter="url(#ffGlow)"
          />
        </svg>
      </div>
    </div>
  );
};

