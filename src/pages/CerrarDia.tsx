import { ArrowLeft, Banknote, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ContadorBilletes } from '../components/caja/ContadorBilletes'
import { MandarResumen } from '../components/caja/MandarResumen'
import { Planilla } from '../components/caja/Planilla'
import { Diferencia, ResumenDia } from '../components/caja/ResumenDia'
import { CampoImporte } from '../components/caja/CampoImporte'
import { Boton } from '../components/ui/Boton'
import { AreaTexto } from '../components/ui/Campo'
import { Confeti } from '../components/ui/Confeti'
import { Aviso, Cargando, MensajeError, Tarjeta, Titulo } from '../components/ui/Estados'
import {
  useCerrarDia,
  useEstadoDelDia,
  usePlanillaJornada,
  useResumenJornada,
  type Jornada,
} from '../datos/caja'
import { calcularArqueo } from '../lib/caja'
import type { AccionTecla } from '../lib/importe'
import { mensajeDeError } from '../lib/errores'
import { formatearFecha, formatearPesos } from '../lib/formato'

export function CerrarDia() {
  const estado = useEstadoDelDia()
  const [cerrada, setCerrada] = useState<Jornada | null>(null)

  if (cerrada) return <DiaCerradoOk jornada={cerrada} />
  if (estado.isPending) return <Cargando />
  if (estado.isError) return <MensajeError>{mensajeDeError(estado.error)}</MensajeError>
  if (!estado.data.abierta) return <Navigate to="/" replace />
  return <FormularioCierre jornada={estado.data.abierta} alCerrar={setCerrada} />
}

function FormularioCierre({
  jornada,
  alCerrar,
}: {
  jornada: Jornada
  alCerrar: (j: Jornada) => void
}) {
  const resumen = useResumenJornada(jornada.id)
  const planilla = usePlanillaJornada(jornada.id)
  const cerrar = useCerrarDia()
  const [contado, setContado] = useState(0)
  const [tipeado, setTipeado] = useState(false)
  const [nota, setNota] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [contando, setContando] = useState(false)

  if (resumen.isPending) return <Cargando />
  if (resumen.isError || !resumen.data)
    return <MensajeError>{mensajeDeError(resumen.error)}</MensajeError>

  const arqueo = calcularArqueo(
    resumen.data.fondo_inicial,
    resumen.data.total_efectivo,
    contado,
    resumen.data.total_salidas,
  )
  const fecha = formatearFecha(new Date(`${jornada.fecha}T12:00:00-03:00`))
  const confirmarCierre = () =>
    cerrar.mutate({ jornadaId: jornada.id, contado, nota }, { onSuccess: alCerrar })

  const alAccion = (accion: Exclude<AccionTecla, null>) => {
    if (accion === 'borrar') {
      if (confirmando) setConfirmando(false)
      else {
        setContado(0)
        setTipeado(false)
      }
      return
    }
    if (accion !== 'efectivo') return
    if (!tipeado) {
      setAviso('Escribí cuánto efectivo contaste. Si no hay nada, escribí 0.')
      return
    }
    if (confirmando) confirmarCierre()
    else setConfirmando(true)
  }

  return (
    <div>
      <Titulo
        subtitulo="Contá la plata de la caja (incluido el fondo inicial) y escribila."
        accion={
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-suave hover:bg-hundida hover:text-texto"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver a la caja
          </Link>
        }
      >
        Cerrar el día {fecha.slice(0, 5)}
      </Titulo>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <Tarjeta className="flex flex-col gap-4 self-start p-6">
          <CampoImporte
            etiqueta="Efectivo contado"
            importe={contado}
            enfocar
            deshabilitado={cerrar.isPending}
            onCambio={(n) => {
              setContado(n)
              setTipeado(true)
              setConfirmando(false)
              setAviso(null)
            }}
            onAccion={alAccion}
          />
          <button
            type="button"
            onClick={() => setContando((c) => !c)}
            aria-expanded={contando}
            className="inline-flex min-h-11 presionable items-center gap-2 self-start rounded-xl border border-borde-fuerte bg-superficie px-4 text-sm font-semibold shadow-tarjeta hover:bg-hundida"
          >
            <Banknote className="size-4" aria-hidden="true" />
            {contando ? 'Ocultar el contador' : 'Contar billete por billete'}
          </button>
          {contando && (
            <ContadorBilletes
              alCambiar={(total) => {
                setContado(total)
                setTipeado(true)
                setConfirmando(false)
                setAviso(null)
              }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-suave">
              Esperado en caja:{' '}
              <strong className="text-texto cifras">{formatearPesos(arqueo.esperado)}</strong>
            </span>
            <span aria-live="polite">{tipeado && <Diferencia monto={arqueo.diferencia} />}</span>
          </div>
          <AreaTexto
            etiqueta="Nota (opcional)"
            placeholder={
              arqueo.diferencia !== 0 && tipeado
                ? 'Ej.: faltó cambio, se pagó un flete'
                : 'Algo que el dueño tenga que saber'
            }
            maxLength={500}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />

          {aviso && <Aviso tono="aviso">{aviso}</Aviso>}
          {cerrar.isError && <MensajeError>{mensajeDeError(cerrar.error)}</MensajeError>}

          {confirmando ? (
            <div
              role="alertdialog"
              aria-labelledby="confirmar-cierre"
              className="flex flex-col gap-3 rounded-xl border border-alerta/30 bg-alerta-suave p-4"
            >
              <p id="confirmar-cierre" className="font-semibold text-texto">
                Vas a cerrar el día. Después no se puede modificar sin un administrador.
              </p>
              <div className="flex flex-wrap gap-2">
                <Boton variante="peligro" cargando={cerrar.isPending} onClick={confirmarCierre}>
                  Sí, cerrar el día · Enter
                </Boton>
                <Boton variante="secundario" onClick={() => setConfirmando(false)}>
                  Volver · Esc
                </Boton>
              </div>
            </div>
          ) : (
            <Boton tamano="grande" disabled={!tipeado} onClick={() => setConfirmando(true)}>
              {tipeado ? 'Cerrar el día · Enter' : 'Escribí el efectivo contado'}
            </Boton>
          )}
        </Tarjeta>

        <Tarjeta titulo="Resumen del día" className="self-start">
          <ResumenDia resumen={resumen.data} />
        </Tarjeta>
      </div>
      {planilla.data && (
        <div className="mt-6">
          <Planilla filas={planilla.data} titulo="Planilla del día, antes de cerrar" />
        </div>
      )}
    </div>
  )
}

function DiaCerradoOk({ jornada }: { jornada: Jornada }) {
  const justa = jornada.diferencia_efectivo === 0
  return (
    <div className="mx-auto w-full max-w-md py-12">
      {justa && <Confeti />}
      <Tarjeta className="flex animate-pop flex-col items-center gap-4 p-8 text-center">
        <CheckCircle2 className="size-14 animate-pop text-ok" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {justa ? '¡Día cerrado, la caja da justa!' : 'Día cerrado'}
        </h1>
        <p className="text-sm text-suave">
          La caja del {formatearFecha(new Date(`${jornada.fecha}T12:00:00-03:00`))} quedó cerrada.
        </p>
        {jornada.diferencia_efectivo !== null && (
          <Diferencia monto={jornada.diferencia_efectivo} grande />
        )}
        <MandarResumen jornada={jornada} />
        <Link
          to="/"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-marca font-semibold text-sobre-marca shadow-tarjeta hover:bg-marca-hover"
        >
          Volver al inicio
        </Link>
      </Tarjeta>
    </div>
  )
}
