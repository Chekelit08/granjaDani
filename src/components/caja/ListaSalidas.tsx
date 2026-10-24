import { useState } from 'react'
import type { Salida } from '../../datos/caja'
import { NOMBRE_MOTIVO_SALIDA, puedeAnular } from '../../lib/caja'
import { formatearHora, formatearPesos } from '../../lib/formato'
import { useSesion } from '../../sesion/Sesion'
import { Chip } from '../ui/Estados'
import { PanelAnular } from './PanelAnular'

/** Lo que salió de la caja en el día. No se muestra si no hubo salidas. */
export function ListaSalidas({ salidas, editable }: { salidas: Salida[]; editable: boolean }) {
  const { perfil, esAdmin } = useSesion()
  const [anulando, setAnulando] = useState<string | null>(null)
  const usuario = { id: perfil?.id ?? '', esAdmin }
  if (salidas.length === 0) return null

  return (
    <section aria-labelledby="titulo-salidas">
      <div className="border-b border-borde px-5 py-3">
        <h2 id="titulo-salidas" className="text-base font-bold">
          Salidas de caja
        </h2>
      </div>
      <ul className="divide-y divide-borde">
        {salidas.map((s) => (
          <li key={s.id} className="px-5">
            <div className={`flex min-h-12 items-center gap-4 ${s.anulada ? 'text-suave' : ''}`}>
              <span className="w-11 text-sm text-suave cifras">
                {formatearHora(new Date(s.registrada_en))}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {s.anulada ? <Chip tono="error">Anulada</Chip> : NOMBRE_MOTIVO_SALIDA[s.motivo]}
                {s.detalle && <span className="text-suave"> · {s.detalle}</span>}
              </span>
              <span
                className={`text-right font-semibold cifras ${s.anulada ? 'line-through' : ''}`}
              >
                − {formatearPesos(s.importe, { sinCentavos: s.importe % 1 === 0 })}
              </span>
              <span className="w-16 text-right">
                {editable && puedeAnular(s, usuario) && anulando !== s.id && (
                  <button
                    type="button"
                    onClick={() => setAnulando(s.id)}
                    className="min-h-9 rounded-lg px-2 text-sm font-medium text-suave hover:bg-alerta-suave hover:text-alerta-texto"
                  >
                    Anular
                  </button>
                )}
              </span>
            </div>
            {anulando === s.id && (
              <div className="pb-3">
                <PanelAnular
                  id={s.id}
                  importe={s.importe}
                  tipo="salida"
                  alTerminar={() => setAnulando(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
