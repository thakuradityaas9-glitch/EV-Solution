const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function BoltIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
    </svg>
  )
}

export function CrosshairIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}

export function StarIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9L12 2.8Z" />
    </svg>
  )
}

export function CloseIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function ExpandIcon({ className = 'h-4 w-4', collapsed = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d={collapsed ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  )
}
