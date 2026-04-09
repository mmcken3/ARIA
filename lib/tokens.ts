/**
 * Design tokens for ARIA.
 *
 * These are the TypeScript-side mirrors of the CSS custom properties defined
 * in globals.css. Use the CSS variables directly in className strings
 * (e.g. `bg-[var(--bg-primary)]`). This file exists so token names are
 * discoverable and refactorable in TypeScript code (e.g. Framer Motion
 * values, canvas drawing, dynamic styles).
 *
 * Rule: if a value isn't here, add it here AND to globals.css before using it.
 */

export const tokens = {
  colors: {
    bg: {
      primary:   'var(--bg-primary)',
      secondary: 'var(--bg-secondary)',
      surface:   'var(--bg-surface)',
      overlay:   'var(--bg-overlay)',
    },
    text: {
      primary:     'var(--text-primary)',
      secondary:   'var(--text-secondary)',
      muted:       'var(--text-muted)',
      placeholder: 'var(--text-placeholder)',
    },
    accent: {
      default: 'var(--accent)',
      subtle:  'var(--accent-subtle)',
      text:    'var(--accent-text)',
    },
    border: {
      default: 'var(--border)',
      strong:  'var(--border-strong)',
    },
    status: {
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger:  'var(--danger)',
    },
  },

  font: {
    display: 'var(--font-display)',
    body:    'var(--font-body)',
    mono:    'var(--font-mono)',
  },

  radius: {
    sm:   '6px',
    md:   '10px',
    lg:   '16px',
    full: '9999px',
  },

  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },

  transition: {
    fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  zIndex: {
    sidebar:      40,
    topbar:       50,
    overlay:      60,
    modal:        70,
    notification: 80,
  },
} as const;
