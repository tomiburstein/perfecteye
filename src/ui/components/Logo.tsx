/** PerfectEye mark: a geometric eye whose iris is a precision reticle. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="logo-mark__lid" d="M2.5 16C7 8.5 12 6 16 6s9 2.5 13.5 10C25 23.5 20 26 16 26S7 23.5 2.5 16Z" />
      <circle className="logo-mark__iris" cx="16" cy="16" r="5.6" />
      <circle className="logo-mark__pupil" cx="16" cy="16" r="1.7" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={28} />
      <span className="logo__word">
        Perfect<span>Eye</span>
      </span>
    </span>
  );
}
