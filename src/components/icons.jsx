/* Iconos de línea, un solo color: heredan el del elemento que los contiene.
   Reemplazan a los emoji, que traían su propia paleta y los dibuja distinto
   cada sistema operativo. */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const TrashIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
    <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
)

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = () => (
  <svg {...base}>
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
  </svg>
)

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const UndoIcon = () => (
  <svg {...base}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 010 12h-3" />
  </svg>
)

export const PlayIcon = () => (
  <svg {...base}>
    <path d="M7 4.5l12 7.5-12 7.5z" />
  </svg>
)

export const StopIcon = () => (
  <svg {...base}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)

export const BoxIcon = () => (
  <svg {...base}>
    <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
)

export const GiftIcon = () => (
  <svg {...base}>
    <rect x="3" y="9" width="18" height="12" rx="2" />
    <path d="M3 13h18M12 9v12" />
    <path d="M12 9S10.5 4 8 4a2.5 2.5 0 000 5h4zM12 9s1.5-5 4-5a2.5 2.5 0 010 5h-4z" />
  </svg>
)

export const CashIcon = () => (
  <svg {...base}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
)

export const TagIcon = () => (
  <svg {...base}>
    <path d="M3 12.5V4a1 1 0 011-1h8.5L21 11.5 12.5 20 3 12.5z" />
    <circle cx="7.5" cy="7.5" r="1.4" />
  </svg>
)

export const PowerIcon = () => (
  <svg {...base}>
    <path d="M12 3v9" />
    <path d="M6.5 6.5a8 8 0 1011 0" />
  </svg>
)

export const ArrowRightIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
)
