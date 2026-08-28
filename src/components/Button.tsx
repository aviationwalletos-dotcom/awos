import React from 'react'

type Variant = 'solid' | 'outline' | 'ghost'
type Tone = 'brand' | 'neutral' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  tone?: Tone
  size?: Size
  loading?: boolean
  iconOnly?: boolean
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-2.5',
}

const toneSolid: Record<Tone, string> = {
  brand: 'bg-sky text-navy hover:bg-sky/90 shadow-[0_0_24px_rgba(34,211,238,0.35)]',
  neutral: 'bg-ink text-navy-dark hover:bg-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}

const toneOutline: Record<Tone, string> = {
  brand: 'border-2 border-sky text-sky hover:bg-sky/10',
  neutral: 'border-2 border-white/15 text-ink hover:bg-white/[0.06]',
  danger: 'border-2 border-rose-500/70 text-rose-300 hover:bg-rose-500/10',
}

const toneGhost: Record<Tone, string> = {
  brand: 'text-sky hover:bg-sky/10',
  neutral: 'text-ink hover:bg-white/[0.08]',
  danger: 'text-rose-300 hover:bg-rose-500/10',
}

export function Button({
  variant = 'solid',
  tone = 'brand',
  size = 'md',
  loading = false,
  iconOnly = false,
  disabled,
  className = '',
  children,
  'aria-label': ariaLabel,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'solid' ? toneSolid[tone] : variant === 'outline' ? toneOutline[tone] : toneGhost[tone]

  const state = disabled ? 'disabled' : loading ? 'loading' : 'idle'

  return (
    <button data-mbaas-dynamic="true"
      data-mbaas-oid="whwrxdb" type="button"
      data-state={state}
      disabled={disabled || loading}
      aria-label={iconOnly ? ariaLabel : undefined}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-control font-semibold
        transition-all duration-200 active:scale-[0.98]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
        disabled:opacity-50 disabled:pointer-events-none
        ${iconOnly ? 'aspect-square p-2' : sizeClasses[size]}
        ${variantClass} ${className}`}
      {...rest}
    >
      {loading ? (
        <span data-mbaas-oid="l0hut3g" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
