/** PerfectEye mark: an eye drawn in two pen strokes, with a precise pupil. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="logo-mark__lid" d="M2.2 17.2C7.5 9 13 7.6 16.3 7.7c4.2.1 9.2 2.4 13.6 8.5" />
      <path className="logo-mark__lid" d="M3 15.4c4.7 6.8 9.4 8.9 13.2 8.9 4.1 0 9-2.3 13.4-8.9" />
      <circle className="logo-mark__iris" cx="16" cy="16" r="5" />
      <circle className="logo-mark__pupil" cx="16" cy="16" r="1.6" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={30} />
      <span className="logo__word">
        Perfect<span>Eye</span>
      </span>
    </span>
  );
}
