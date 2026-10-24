import { forwardRef, type KeyboardEvent } from 'react'
import {
  accionDeTecla,
  formatearImporteEnCurso,
  normalizarImporte,
  type AccionTecla,
} from '../../lib/importe'

/**
 * Campo grande para tipear el importe con el teclado. Solo acepta dígitos y los muestra
 * con puntos de miles. Enter, +, − y Esc se avisan con onAccion (no se escriben en el campo).
 */
export const CampoImporte = forwardRef<
  HTMLInputElement,
  {
    importe: number
    onCambio: (importe: number) => void
    onAccion?: (accion: Exclude<AccionTecla, null>) => void
    etiqueta: string
    deshabilitado?: boolean
    enfocar?: boolean
    describedBy?: string
    /** Compacto: para usarlo al lado de otros campos (la carga del ticket). */
    compacto?: boolean
    /** Valor sugerido que se ve en gris mientras no se tipee nada (el importe calculado). */
    sugerido?: number
    /** Cualquier otra tecla (por ejemplo, letras para elegir producto). */
    onOtraTecla?: (e: KeyboardEvent<HTMLInputElement>) => void
  }
>(function CampoImporte(
  {
    importe,
    onCambio,
    onAccion,
    etiqueta,
    deshabilitado,
    enfocar,
    describedBy,
    compacto = false,
    sugerido,
    onOtraTecla,
  },
  ref,
) {
  const alPresionar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const accion = accionDeTecla(e)
    if (accion) {
      e.preventDefault()
      onAccion?.(accion)
      return
    }
    onOtraTecla?.(e)
  }

  return (
    <label
      className={`group block rounded-2xl border border-borde-fuerte bg-superficie shadow-tarjeta transition-colors focus-within:border-foco focus-within:ring-4 focus-within:ring-foco/15 ${compacto ? 'px-4 pt-2 pb-2.5' : 'px-5 pt-3 pb-4'}`}
    >
      <span className="text-xs font-semibold tracking-wide text-suave uppercase">{etiqueta}</span>
      <span className="mt-1 flex items-baseline gap-2">
        <span
          className={`font-medium text-suave ${compacto ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}
          aria-hidden="true"
        >
          $
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          aria-label={etiqueta}
          aria-describedby={describedBy}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- en la caja el cursor tiene que estar siempre listo
          autoFocus={enfocar}
          readOnly={deshabilitado}
          aria-busy={deshabilitado || undefined}
          placeholder={sugerido ? formatearImporteEnCurso(sugerido) : '0'}
          value={formatearImporteEnCurso(importe)}
          onChange={(e) => onCambio(normalizarImporte(e.target.value))}
          onKeyDown={alPresionar}
          className={`w-full min-w-0 bg-transparent font-bold tracking-tight text-texto cifras outline-none read-only:opacity-60 ${compacto ? 'text-3xl' : 'text-5xl sm:text-6xl'} ${sugerido ? 'placeholder:text-suave' : 'placeholder:text-borde-fuerte'}`}
        />
      </span>
    </label>
  )
})
