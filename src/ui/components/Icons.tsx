const common = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const HelpIcon = () => (
  <svg {...common}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" />
    <circle cx="12" cy="17.2" r=".6" fill="currentColor" />
  </svg>
);
export const StatsIcon = () => (
  <svg {...common}>
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </svg>
);
export const SunIcon = () => (
  <svg {...common}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...common}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);
export const CloseIcon = () => (
  <svg {...common}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const BackIcon = () => (
  <svg {...common}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const ShareIcon = () => (
  <svg {...common}>
    <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
export const CopyIcon = () => (
  <svg {...common}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);
export const TrophyIcon = () => (
  <svg {...common}>
    <path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z" />
    <path d="M8 6.5H5.2c0 2.6 1.2 4 3.1 4.3M16 6.5h2.8c0 2.6-1.2 4-3.1 4.3M12 13.5v3.5M8.5 20h7M10 17h4" />
  </svg>
);
