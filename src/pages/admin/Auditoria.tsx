import { useState } from 'react'
import { Boton } from '../../components/ui/Boton'
import { Selector } from '../../components/ui/Campo'
import { Cargando, MensajeError, Titulo, Vacio } from '../../components/ui/Estados'
import { useAuditoria } from '../../datos/admin'
import { ACCIONES, describir } from '../../lib/auditoria'
import { mensajeDeError } from '../../lib/errores'

export default function Auditoria() {
  const [accion, setAccion] = useState('')
  const [limite, setLimite] = useState(50)
  const registros = useAuditoria(accion, limite)

  return (
    <div className="flex flex-col gap-4">
      <Titulo>Auditoría</Titulo>
      <p className="max-w-2xl text-suave">
        Todo lo sensible queda anotado acá y no se puede borrar: anulaciones, cierres, reaperturas,
        cambios de usuarios y pagos.
      </p>
      <div className="max-w-xs">
        <Selector etiqueta="Mostrar" value={accion} onChange={(e) => setAccion(e.target.value)}>
          <option value="">Todo</option>
          {Object.entries(ACCIONES).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </Selector>
      </div>
      {registros.isPending ? (
        <Cargando />
      ) : registros.isError ? (
        <MensajeError>{mensajeDeError(registros.error)}</MensajeError>
      ) : registros.data.length === 0 ? (
        <Vacio titulo="Todavía no hay movimientos registrados" />
      ) : (
        <>
          <ol className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
            {registros.data.map((r) => {
              const { frase, cuando } = describir(r)
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span>{frase}</span>
                  <time
                    dateTime={r.created_at}
                    className="text-sm whitespace-nowrap text-suave cifras"
                  >
                    {cuando}
                  </time>
                </li>
              )
            })}
          </ol>
          {registros.data.length === limite && (
            <Boton
              variante="secundario"
              className="self-start"
              onClick={() => setLimite((l) => l + 50)}
            >
              Ver más
            </Boton>
          )}
        </>
      )}
    </div>
  )
}
