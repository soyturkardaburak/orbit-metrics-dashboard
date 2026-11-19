export function Mark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g className="orbit-spin">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="2.5 3.5" />
        <circle cx="16" cy="4" r="2.1" fill="var(--cyan)" />
      </g>
    </svg>
  )
}
