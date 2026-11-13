import type { RoundId } from '../../games/classic/types';

/** Small hand-drawn style glyph for each test (used instead of emoji in the UI). */
export function RoundGlyph({ id, size = 26 }: { id: RoundId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'glyph',
  };
  switch (id) {
    case 'center':
      return (
        <svg {...common}>
          <path d="M20.2 12.3c-.1 4.6-3.8 8.1-8.3 8-4.5-.1-8.1-3.8-8-8.4.1-4.4 3.9-8 8.4-7.8 4.4.2 7.9 3.8 7.9 8.2" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'half':
      return (
        <svg {...common}>
          <path d="M3.5 12.2c5.6-.3 11.3-.2 17 0" />
          <path d="M3.6 9v6.2M20.4 9.1v6M12 7.6v8.8" />
        </svg>
      );
    case 'angle':
      return (
        <svg {...common}>
          <path d="M4 19.2c5.4.1 10.8 0 16.2.1M4 19.2c3.3-4.9 7-9.5 10.6-14" />
          <path d="M9.6 19.1c0-1.6-.5-3-1.4-4.2" />
        </svg>
      );
    case 'distance':
      return (
        <svg {...common}>
          <path d="M5 17.5 11.8 7.6 19.2 16.8" />
          <circle cx="5" cy="17.5" r="1.6" fill="currentColor" />
          <circle cx="11.8" cy="7.6" r="1.6" fill="currentColor" />
          <circle cx="19.2" cy="16.8" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'shape':
      return (
        <svg {...common}>
          <path d="M12.2 4.2 20.3 19c-5.4.3-11 .2-16.5.1L12.1 4.4" />
        </svg>
      );
  }
}
