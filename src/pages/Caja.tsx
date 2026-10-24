import {
  ArrowRight,
  Banknote,
  CalendarDays,
  HandCoins,
  LockKeyhole,
  RotateCcw,
  Scale,
  Smartphone,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CampoImporte } from '../components/caja/CampoImporte'
import { CargaTicket } from '../components/caja/CargaTicket'
import { ListaSalidas } from '../components/caja/ListaSalidas'
import { ListaTickets } from '../components/caja/ListaTickets'
import { MandarResumen } from '../components/caja/MandarResumen'
import { Planilla } from '../components/caja/Planilla'
import { ResumenDia } from '../components/caja/ResumenDia'
import { SacarEfectivo } from '../components/caja/SacarEfectivo'
import { Boton } from '../components/ui/Boton'
import { Aviso, Cargando, Chip, MensajeError, Tarjeta, Titulo } from '../components/ui/Estados'
import {
  useAbrirDia,
  useEstadoDelDia,
  usePlanillaJornada,
  useProductos,
  useReabrirDia,
  useResumenJornada,
  useSalidasDeJornada,
  useVentasDeJornada,
  type Jornada,
  type ResumenJornada,
} from '../datos/caja'
import { mensajeDeError } from '../lib/errores'
import {
  cantidadVentas,
  fechaDeTrabajo,
  formatearCantidad,
  formatearFecha,
  formatearPesos,
} from '../lib/formato'
import { diaSemanaCorto } from '../lib/periodos'
import { horaArgentina, saludo } from '../lib/ayudas'
import { useEnLinea } from '../lib/useEnLinea'
import { useNumeroAnimado } from '../lib/useNumeroAnimado'
import { useSesion } from '../sesion/Sesion'

function fechaCorta(fecha: string) {
  return formatearFecha(new Date(`${fecha}T12:00:00-03:00`)).slice(0, 5)
}

const p = (n: number) => formatearPesos(n, { sinCentavos: n % 1 === 0 })

export function Caja() {
  const estado = useEstadoDelDia()
  const enLinea = useEnLinea()

  return (
    <div className="flex flex-col gap-4">
      {!enLinea && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl bg-alerta px-4 py-3 font-semibold text-white"
        >
          <WifiOff className="size-5 shrink-0" aria-hidden="true" />
          Sin internet. Las ventas no se van a guardar hasta que vuelva la conexión.
        </div>
      )}
      <AvisoLunes />
      {estado.isPending ? (
        <Cargando texto="Buscando el día…" />
      ) : estado.isError ? (
        <MensajeError
          accion={
            <Boton variante="secundario" tamano="chico" onClick={() => void estado.refetch()}>
              Reintentar
            </Boton>
          }
        >
          {mensajeDeError(estado.error)}
        </MensajeError>
      ) : estado.data.abierta && estado.data.abierta.fecha !== estado.data.hoy ? (
        <DiaViejoAbierto jornada={estado.data.abierta} />
      ) : estado.data.abierta ? (
        <DiaAbierto jornada={estado.data.abierta} />
      ) : estado.data.deHoy ? (
        <DiaCerrado jornada={estado.data.deHoy} />
      ) : (
        <AbrirDia hoy={estado.data.hoy} />
      )}
    </div>
  )
}

/** "Buenas tardes, Dani" (a la cuenta compartida del mostrador no se la nombra). */
function useSaludo() {
  const { perfil } = useSesion()
  const nombre = perfil && perfil.rol === 'admin' ? `, ${perfil.nombre.split(' ')[0]}` : ''
  return `${saludo(horaArgentina())}${nombre}`
}

/** Los lunes, al dueño le recuerda que ya está el resumen de la semana pasada. */
function AvisoLunes() {
  const { esAdmin } = useSesion()
  const esLunes = new Date(`${fechaDeTrabajo(new Date())}T12:00:00`).getDay() === 1
  if (!esAdmin || !esLunes) return null
  return (
    <Link
      to="/panel"
      className="flex presionable animate-aparecer items-center gap-3 rounded-tarjeta border border-marca/20 bg-marca-suave px-4 py-3 text-sm font-medium text-marca hover:brightness-95"
    >
      <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        Ya está el resumen de la semana pasada para mandar por WhatsApp.
      </span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

function Centrado({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-md py-6 sm:py-12">{children}</div>
}

function AbrirDia({ hoy }: { hoy: string }) {
  const saludoDelDia = useSaludo()
  const abrir = useAbrirDia()
  const [fondo, setFondo] = useState(0)

  return (
    <Centrado>
      <Tarjeta className="flex flex-col gap-5 p-6">
        <div>
          <p className="text-sm text-suave">
            {saludoDelDia} ·{' '}
            <span className="inline-block first-letter:uppercase">{diaSemanaCorto(hoy)}</span>
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">Abrir el día</h1>
          <p className="mt-1 text-sm text-suave">
            Si arrancás con plata para el cambio, escribila. Si no, dejalo en 0 y apretá Enter.
          </p>
        </div>
        <CampoImporte
          etiqueta="Fondo de caja inicial"
          importe={fondo}
          onCambio={setFondo}
          enfocar
          onAccion={(a) => {
            if (a === 'efectivo' && !abrir.isPending) abrir.mutate(fondo)
            if (a === 'borrar') setFondo(0)
          }}
        />
        {abrir.isError && <MensajeError>{mensajeDeError(abrir.error)}</MensajeError>}
        <Boton tamano="grande" cargando={abrir.isPending} onClick={() => abrir.mutate(fondo)}>
          Abrir el día · Enter
        </Boton>
      </Tarjeta>
    </Centrado>
  )
}

function DiaViejoAbierto({ jornada }: { jornada: Jornada }) {
  return (
    <Centrado>
      <Tarjeta className="flex flex-col gap-4 p-6">
        <Chip tono="aviso">Pendiente de cierre</Chip>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Quedó abierto el {fechaCorta(jornada.fecha)}
        </h1>
        <p className="text-sm text-suave">
          Antes de abrir el día de hoy hay que cerrar ese día y contar la caja.
        </p>
        <Link
          to="/cerrar"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-marca font-bold text-sobre-marca shadow-tarjeta hover:bg-marca-hover"
        >
          Cerrar el día {fechaCorta(jornada.fecha)}{' '}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Tarjeta>
    </Centrado>
  )
}

function DiaCerrado({ jornada }: { jornada: Jornada }) {
  const { esAdmin } = useSesion()
  const resumen = useResumenJornada(jornada.id)
  const reabrir = useReabrirDia()
  const [confirmar, setConfirmar] = useState(false)

  return (
    <Centrado>
      <Tarjeta className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">El día de hoy ya se cerró</h1>
            <p className="mt-1 text-sm text-suave">
              La caja quedó bloqueada. Mañana se abre un día nuevo.
            </p>
          </div>
          <LockKeyhole className="size-6 text-suave" aria-hidden="true" />
        </div>
        {resumen.data && <ResumenDia resumen={resumen.data} />}
        <MandarResumen jornada={jornada} />
        {esAdmin &&
          (confirmar ? (
            <Aviso
              tono="aviso"
              accion={
                <div className="flex gap-2">
                  <Boton variante="secundario" tamano="chico" onClick={() => setConfirmar(false)}>
                    No
                  </Boton>
                  <Boton
                    tamano="chico"
                    cargando={reabrir.isPending}
                    onClick={() => reabrir.mutate(jornada.id)}
                  >
                    Sí, reabrir
                  </Boton>
                </div>
              }
            >
              ¿Reabrir el día? Va a quedar registrado en la auditoría.
              {reabrir.isError && <span className="block">{mensajeDeError(reabrir.error)}</span>}
            </Aviso>
          ) : (
            <Boton variante="secundario" onClick={() => setConfirmar(true)}>
              <RotateCcw className="size-4" aria-hidden="true" /> Reabrir el día
            </Boton>
          ))}
      </Tarjeta>
    </Centrado>
  )
}

function Indicador({
  etiqueta,
  valor,
  detalle,
  Icono,
  tono,
  formato = p,
}: {
  etiqueta: string
  valor: number
  detalle?: string
  Icono: typeof Banknote
  tono: string
  formato?: (n: number) => string
}) {
  const animado = useNumeroAnimado(valor)
  return (
    <div className="rounded-tarjeta border border-borde bg-superficie p-4 shadow-tarjeta transition-shadow hover:shadow-alta">
      <p className="flex items-center gap-2 text-xs font-semibold text-suave">
        <span className={`grid size-7 place-items-center rounded-lg ${tono}`}>
          <Icono className="size-4" aria-hidden="true" />
        </span>
        {etiqueta}
      </p>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight cifras">{formato(animado)}</p>
      {detalle && <p className="mt-0.5 text-xs text-suave">{detalle}</p>}
    </div>
  )
}

/** Cuando el total sube, muestra "+ $ X" flotando un momento (no al cargar la pantalla). */
function useSuma(total: number | null) {
  const anterior = useRef(total)
  const [suma, setSuma] = useState<{ monto: number; clave: number } | null>(null)
  useEffect(() => {
    const previo = anterior.current
    anterior.current = total
    if (previo === null || total === null || total <= previo) return
    setSuma({ monto: total - previo, clave: Date.now() })
    const t = window.setTimeout(() => setSuma(null), 1_400)
    return () => window.clearTimeout(t)
  }, [total])
  return suma
}

function IndicadoresDelDia({ r }: { r: ResumenJornada | null | undefined }) {
  const total = r?.total ?? 0
  const totalAnimado = useNumeroAnimado(total, 700)
  const suma = useSuma(r ? total : null)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="relative col-span-2 overflow-hidden rounded-tarjeta bg-marca p-5 text-sobre-marca shadow-alta lg:col-span-1">
        <TrendingUp
          className="pointer-events-none absolute -right-4 -bottom-6 size-28 text-acento opacity-25"
          aria-hidden="true"
        />
        <p className="text-xs font-bold tracking-wider uppercase opacity-80">Total de hoy</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight cifras">{p(totalAnimado)}</p>
        {suma && (
          <span
            key={suma.clave}
            aria-hidden="true"
            className="absolute top-4 right-4 animate-flotar rounded-full bg-acento px-3 py-1 text-sm font-bold text-sobre-acento cifras"
          >
            + {p(suma.monto)}
          </span>
        )}
        <p className="mt-1 text-sm opacity-80">{cantidadVentas(r?.cantidad_tickets ?? 0)}</p>
      </div>
      <Indicador
        etiqueta="Efectivo"
        Icono={Banknote}
        tono="bg-efectivo-suave text-efectivo"
        valor={r?.total_efectivo ?? 0}
        detalle={`En caja ${p(r?.efectivo_esperado ?? 0)}`}
      />
      <Indicador
        etiqueta="Mercado Pago"
        Icono={Smartphone}
        tono="bg-mp-suave text-mp"
        valor={r?.total_mercadopago ?? 0}
        detalle={cantidadVentas(r?.cantidad_mercadopago ?? 0)}
      />
      <Indicador
        etiqueta="Kilos vendidos"
        Icono={Scale}
        tono="bg-acento-suave text-aviso"
        // La animación cuenta en enteros: se anima en décimas de kilo.
        valor={Math.round((r?.kilos ?? 0) * 10)}
        formato={(n) => formatearCantidad(n / 10)}
        detalle={`Ticket promedio ${p(Math.round(r?.ticket_promedio ?? 0))}`}
      />
    </div>
  )
}

function DiaAbierto({ jornada }: { jornada: Jornada }) {
  const saludoDelDia = useSaludo()
  const resumen = useResumenJornada(jornada.id, { vivo: true })
  const ventas = useVentasDeJornada(jornada.id, { vivo: true })
  const planilla = usePlanillaJornada(jornada.id, { vivo: true })
  const salidas = useSalidasDeJornada(jornada.id)
  const productos = useProductos()
  const [resaltado, setResaltado] = useState<string | null>(null)
  const [sacando, setSacando] = useState(false)

  return (
    <div>
      <Titulo
        subtitulo={
          <>
            {saludoDelDia} ·{' '}
            <span className="inline-block first-letter:uppercase">
              {diaSemanaCorto(jornada.fecha)}
            </span>
          </>
        }
        accion={
          <div className="flex flex-wrap items-center gap-3">
            <Chip tono="ok">
              <span className="animate-latir motion-reduce:animate-none">●</span> Día abierto
            </Chip>
            <button
              type="button"
              onClick={() => setSacando(true)}
              aria-keyshortcuts="-"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde-fuerte bg-superficie px-4 text-[15px] font-bold shadow-tarjeta hover:bg-hundida"
            >
              <HandCoins className="size-4" aria-hidden="true" /> Sacar efectivo
            </button>
            <Link
              to="/cerrar"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde-fuerte bg-superficie px-4 text-[15px] font-bold shadow-tarjeta hover:bg-hundida"
            >
              Cerrar el día <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        }
      >
        Caja de hoy
      </Titulo>
      <div className="flex flex-col gap-6">
        <IndicadoresDelDia r={resumen.data} />
        <Tarjeta className="p-4 sm:p-5">
          {sacando ? (
            <div className="mx-auto max-w-md">
              <SacarEfectivo alTerminar={() => setSacando(false)} />
            </div>
          ) : productos.isError ? (
            <MensajeError>{mensajeDeError(productos.error)}</MensajeError>
          ) : productos.data ? (
            <CargaTicket
              productos={productos.data}
              onGuardado={setResaltado}
              onSacarEfectivo={() => setSacando(true)}
            />
          ) : (
            <Cargando texto="Cargando productos…" />
          )}
        </Tarjeta>
        {planilla.data && <Planilla filas={planilla.data} />}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Tarjeta sinRelleno className="self-start">
            {ventas.isError ? (
              <div className="p-5">
                <MensajeError>{mensajeDeError(ventas.error)}</MensajeError>
              </div>
            ) : ventas.data && productos.data ? (
              <ListaTickets
                ventas={ventas.data}
                productos={productos.data}
                editable
                limite={10}
                resaltado={resaltado}
              />
            ) : (
              <Cargando />
            )}
          </Tarjeta>
          {salidas.data && salidas.data.length > 0 && (
            <Tarjeta sinRelleno className="self-start">
              <ListaSalidas salidas={salidas.data} editable />
            </Tarjeta>
          )}
        </div>
      </div>
    </div>
  )
}
