import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Not found — Orbit Metrics'
  }, [])
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="font-mono text-xs tracking-[0.22em] text-[var(--coral)] uppercase">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">That view is not on the board.</h1>
      <Link className="mt-6 inline-block text-sm font-medium text-[var(--cyan)]" to="/">
        Back to the overview
      </Link>
    </div>
  )
}
