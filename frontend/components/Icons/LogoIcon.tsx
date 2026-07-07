export function LogoIcon({ className = "h-7 w-7" }) {
    return (
      <svg viewBox="0 0 36 40" fill="none" stroke="currentColor"
           strokeWidth={3.5} strokeLinecap="round" className={className}>
        <line x1="18" y1="38" x2="18" y2="18" />
        <line x1="5"  y1="18" x2="31" y2="18" />
        <line x1="5"  y1="18" x2="5"  y2="2" />
        <line x1="31" y1="18" x2="31" y2="2" />
      </svg>
    );
  }