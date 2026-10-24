import { useState } from 'react'
import { Boton } from '../../components/ui/Boton'
import { Campo } from '../../components/ui/Campo'
import { Cargando, MensajeError, Tarjeta, Titulo } from '../../components/ui/Estados'
import { useActualizarConfiguracion, type Configuracion } from '../../datos/admin'
import { useConfiguracion } from '../../datos/caja'
import { mensajeDeError } from '../../lib/errores'
import { normalizarWhatsapp } from '../../lib/whatsapp'

export default function Ajustes() {
  const config = useConfiguracion()
  return (
    <div className="flex flex-col gap-6">
      <Titulo subtitulo="Resumen por WhatsApp y topes de la caja.">Ajustes</Titulo>
      {config.isPending ? (
        <Cargando />
      ) : config.isError ? (
        <MensajeError>{mensajeDeError(config.error)}</MensajeError>
      ) : (
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <WhatsappDueno config={config.data} />
          <TopeConfirmacion config={config.data} />
        </div>
      )}
    </div>
  )
}

function WhatsappDueno({ config }: { config: Configuracion }) {
  const actualizar = useActualizarConfiguracion()
  const [numero, setNumero] = useState(config.whatsapp_dueno ?? '')
  const normalizado = normalizarWhatsapp(numero)
  const invalido = numero.trim() !== '' && !normalizado

  return (
    <Tarjeta titulo="Resumen por WhatsApp" className="flex flex-col gap-4">
      <p className="text-sm text-suave">
        Al cerrar el día aparece un botón para mandarle el resumen a este número.
      </p>
      <Campo
        etiqueta="WhatsApp del dueño"
        inputMode="tel"
        placeholder="11 2233 4455"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        error={invalido ? 'Escribí el número con característica, sin el 0 ni el 15.' : undefined}
        ayuda={
          normalizado ? `Se manda a +${normalizado}` : 'Si lo dejás vacío, se elige al mandar.'
        }
      />
      <Boton
        variante="secundario"
        disabled={invalido || (normalizado ?? null) === config.whatsapp_dueno}
        cargando={actualizar.isPending}
        onClick={() => actualizar.mutate({ id: config.id, whatsapp_dueno: normalizado ?? null })}
      >
        Guardar número
      </Boton>
      {actualizar.isError && <MensajeError>{mensajeDeError(actualizar.error)}</MensajeError>}
    </Tarjeta>
  )
}

function TopeConfirmacion({ config }: { config: Configuracion }) {
  const actualizar = useActualizarConfiguracion()
  const [tope, setTope] = useState(String(config.tope_confirmacion))
  const valor = Number(tope.replace(/\D/g, ''))

  return (
    <Tarjeta titulo="Importe alto" className="flex flex-col gap-4">
      <Campo
        etiqueta="Pedir confirmación arriba de ($)"
        inputMode="numeric"
        value={tope}
        onChange={(e) => setTope(e.target.value)}
        ayuda="Para que un cero de más no pase de largo."
      />
      <Boton
        variante="secundario"
        disabled={!(valor > 0) || valor === config.tope_confirmacion}
        cargando={actualizar.isPending}
        onClick={() => actualizar.mutate({ id: config.id, tope_confirmacion: valor })}
      >
        Guardar
      </Boton>
      {actualizar.isError && <MensajeError>{mensajeDeError(actualizar.error)}</MensajeError>}
    </Tarjeta>
  )
}
