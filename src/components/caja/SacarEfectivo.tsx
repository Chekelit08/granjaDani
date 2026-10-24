import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useRegistrarSalida, type MotivoSalida } from '../../datos/caja'
import { NOMBRE_MOTIVO_SALIDA } from '../../lib/caja'
import { mensajeDeError } from '../../lib/errores'
import { formatearPesos } from '../../lib/formato'
import { Boton } from '../ui/Boton'
import { Aviso } from '../ui/Estados'
import { CampoImporte } from './CampoImporte'

const AYUDA_MOTIVO: Record<MotivoSalida, string> = {
  proveedor: 'Queda también como gasto de mercadería.',
  retiro: 'No es un gasto: solo sale de la caja.',
  gasto: 'Queda también como gasto del local.',
  otro: 'Contá para qué fue.',
}

/**
 * Sacar plata de la caja con el día abierto (pagarle al proveedor, retiro del dueño).
 * Se resta del efectivo esperado, así el arqueo cierra.
 */
export function SacarEfectivo({ alTerminar }: { alTerminar: () => void }) {
  const [importe, setImporte] = useState(0)
  const [motivo, setMotivo] = useState<MotivoSalida | null>(null)
  const [detalle, setDetalle] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const registrar = useRegistrarSalida()

  const guardar = () => {
    if (registrar.isPending) return
    if (importe <= 0) return setAviso('Escribí cuánta plata sacaste.')
    if (!motivo) return setAviso('Elegí para qué sacaste la plata.')
    if (motivo === 'otro' && detalle.trim().length < 2)
      return setAviso('Contá en pocas palabras para qué fue la plata.')
    setAviso(null)
    registrar.mutate({ importe, motivo, detalle: detalle.trim() }, { onSuccess: alTerminar })
  }

  return (
    <section aria-labelledby="titulo-salida" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-salida" className="text-base font-bold">
          Sacar efectivo de la caja
        </h2>
        <button
          type="button"
          onClick={alTerminar}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-suave hover:bg-hundida hover:text-texto"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Volver · Esc
        </button>
      </div>

      <CampoImporte
        etiqueta="Importe que sale"
        importe={importe}
        enfocar
        deshabilitado={registrar.isPending}
        onCambio={(n) => {
          setImporte(n)
          setAviso(null)
        }}
        onAccion={(a) => {
          if (a === 'efectivo') guardar()
          if (a === 'borrar') {
            if (importe > 0) setImporte(0)
            else alTerminar()
          }
        }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">¿Para qué es?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(NOMBRE_MOTIVO_SALIDA) as MotivoSalida[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMotivo(m)
                setAviso(null)
              }}
              aria-pressed={motivo === m}
              className="min-h-11 rounded-xl border border-borde-fuerte bg-superficie px-3 text-sm font-medium hover:bg-hundida aria-pressed:border-marca aria-pressed:bg-marca aria-pressed:text-sobre-marca"
            >
              {NOMBRE_MOTIVO_SALIDA[m]}
            </button>
          ))}
        </div>
        {motivo && <p className="text-xs text-suave">{AYUDA_MOTIVO[motivo]}</p>}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>
          {motivo === 'proveedor' ? 'Proveedor' : 'Detalle'}{' '}
          {motivo !== 'otro' && <span className="font-normal text-suave">(opcional)</span>}
        </span>
        <input
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              guardar()
            }
          }}
          maxLength={120}
          placeholder={motivo === 'proveedor' ? 'Ej.: Pollos Don Juan' : 'Ej.: bolsas, lavandina'}
          className="min-h-11 rounded-xl border border-borde-fuerte bg-superficie px-3 font-normal focus:border-foco focus:ring-3 focus:ring-foco/20 focus:outline-none"
        />
      </label>

      {aviso && <Aviso tono="aviso">{aviso}</Aviso>}
      {registrar.isError && <Aviso tono="error">{mensajeDeError(registrar.error)}</Aviso>}

      <Boton tamano="grande" cargando={registrar.isPending} onClick={guardar}>
        {importe > 0
          ? `Sacar ${formatearPesos(importe, { sinCentavos: true })} · Enter`
          : 'Sacar efectivo · Enter'}
      </Boton>
    </section>
  )
}
