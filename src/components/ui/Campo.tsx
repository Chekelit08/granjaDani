import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface Base {
  etiqueta: string
  ayuda?: ReactNode
  error?: string
}

const estiloControl =
  'min-h-11 w-full rounded-xl border border-borde-fuerte bg-superficie px-3 text-[15px] text-texto shadow-tarjeta placeholder:text-suave/70 focus:border-foco focus:outline-none focus:ring-3 focus:ring-foco/20 aria-invalid:border-alerta'

function Envoltura({
  id,
  etiqueta,
  ayuda,
  error,
  children,
}: Base & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-alerta-texto">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, ayuda?: ReactNode, error?: string) {
  if (error) return `${id}-error`
  if (ayuda) return `${id}-ayuda`
  return undefined
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  className = '',
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, ayuda, error)}
        className={`${estiloControl} ${className}`}
        {...props}
      />
    </Envoltura>
  )
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  children,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, ayuda, error)}
        className={estiloControl}
        {...props}
      >
        {children}
      </select>
    </Envoltura>
  )
}

export function AreaTexto({
  etiqueta,
  ayuda,
  error,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error}>
      <textarea
        id={id}
        rows={2}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, ayuda, error)}
        className={`${estiloControl} py-2`}
        {...props}
      />
    </Envoltura>
  )
}
