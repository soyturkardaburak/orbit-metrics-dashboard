import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef(onClose)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#040812]/70 p-4" onMouseDown={() => closeRef.current()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orbit-dialog-title"
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="orbit-dialog-title" className="font-display text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{children}</div>
      </div>
    </div>
  )
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)] md:p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}
