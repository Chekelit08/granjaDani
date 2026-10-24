import type { ButtonHTMLAttributes } from 'react'

type Variante = 'marca' | 'secundario' | 'peligro' | 'fantasma'
type Tamano = 'chico' | 'normal' | 'grande'

const VARIANTES: Record<Variante, string> = {
  marca: 'bg-marca text-sobre-marca shadow-tarjeta hover:bg-marca-hover',
  secundario: 'border border-borde-fuerte bg-superficie text-texto shadow-tarjeta hover:bg-hundida',
  peligro: 'bg-alerta text-white shadow-tarjeta hover:brightness-110',
  fantasma: 'text-suave hover:bg-hundida hover:text-texto',
}

const TAMANOS: Record<Tamano, string> = {
  chico: 'min-h-9 px-3 text-sm',
  normal: 'min-h-11 px-4 text-[15px]',
  grande: 'min-h-14 px-6 text-base',
}

export function Boton({
  variante = 'marca',
  tamano = 'normal',
  className = '',
  cargando = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex presionable touch-manipulation items-center justify-center gap-2 rounded-xl font-bold select-none disabled:cursor-not-allowed disabled:opacity-50 ${TAMANOS[tamano]} ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  )
}
