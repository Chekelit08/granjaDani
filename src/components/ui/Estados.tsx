import { AlertCircle, Banknote, CheckCircle2, Info, Loader2, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { NOMBRE_MEDIO, NOMBRE_MEDIO_CORTO, type MedioPago } from '../../lib/caja'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-suave">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  )
}

type TonoAviso = 'error' | 'ok' | 'info' | 'aviso'

const TONOS: Record<TonoAviso, { clase: string; Icono: typeof Info }> = {
  error: { clase: 'border-alerta/30 bg-alerta-suave text-alerta-texto', Icono: AlertCircle },
  ok: { clase: 'border-ok/30 bg-ok-suave text-ok', Icono: CheckCircle2 },
  info: { clase: 'border-borde bg-hundida text-texto', Icono: Info },
  aviso: { clase: 'border-aviso/30 bg-aviso-suave text-aviso', Icono: AlertCircle },
}

/** Mensaje en línea con ícono. El color siempre va acompañado de texto. */
export function Aviso({
  tono = 'info',
  children,
  accion,
}: {
  tono?: TonoAviso
  children: ReactNode
  accion?: ReactNode
}) {
  const { clase, Icono } = TONOS[tono]
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm ${clase}`}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 font-medium">{children}</div>
      {accion}
    </div>
  )
}

export function MensajeError({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <Aviso tono="error" accion={accion}>
      {children}
    </Aviso>
  )
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-tarjeta border border-dashed border-borde-fuerte px-4 py-10 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 text-sm text-suave">{children}</div>}
    </div>
  )
}

export function Tarjeta({
  children,
  className = '',
  titulo,
  accion,
  sinRelleno = false,
}: {
  children: ReactNode
  className?: string
  titulo?: ReactNode
  accion?: ReactNode
  /** Para listas que llegan hasta el borde de la tarjeta. */
  sinRelleno?: boolean
}) {
  return (
    <section
      className={`rounded-tarjeta border border-borde bg-superficie shadow-tarjeta ${sinRelleno ? 'overflow-hidden' : 'p-5'} ${className}`}
    >
      {(titulo || accion) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-base font-bold tracking-tight">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

/** Encabezado de página: título a la izquierda, acciones a la derecha. */
export function Titulo({
  children,
  subtitulo,
  accion,
}: {
  children: ReactNode
  subtitulo?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{children}</h1>
        {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
      </div>
      {accion}
    </div>
  )
}

type TonoChip = 'neutro' | 'ok' | 'aviso' | 'error' | 'marca'

const CHIPS: Record<TonoChip, string> = {
  neutro: 'bg-hundida text-suave',
  ok: 'bg-ok-suave text-ok',
  aviso: 'bg-aviso-suave text-aviso',
  error: 'bg-alerta-suave text-alerta-texto',
  marca: 'bg-marca-suave text-marca',
}

export function Chip({ tono = 'neutro', children }: { tono?: TonoChip; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIPS[tono]}`}
    >
      {children}
    </span>
  )
}

/** Medio de pago con su color, siempre con texto (nunca solo color). */
export function EtiquetaMedio({ medio, corto = false }: { medio: MedioPago; corto?: boolean }) {
  const efectivo = medio === 'efectivo'
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={`grid size-6 place-items-center rounded-md ${efectivo ? 'bg-efectivo-suave text-efectivo' : 'bg-mp-suave text-mp'}`}
      >
        {efectivo ? <Banknote className="size-3.5" /> : <Smartphone className="size-3.5" />}
      </span>
      {corto ? NOMBRE_MEDIO_CORTO[medio] : NOMBRE_MEDIO[medio]}
    </span>
  )
}
