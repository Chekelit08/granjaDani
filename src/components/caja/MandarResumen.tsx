import { MessageCircle } from 'lucide-react'
import {
  useConfiguracion,
  usePlanillaJornada,
  useResumenJornada,
  type Jornada,
} from '../../datos/caja'
import { enlaceWhatsapp, textoResumen } from '../../lib/whatsapp'

/** Abre WhatsApp con el resumen del día listo para mandar (al dueño, si su número está cargado). */
export function MandarResumen({ jornada }: { jornada: Jornada }) {
  const resumen = useResumenJornada(jornada.id)
  const planilla = usePlanillaJornada(jornada.id)
  const config = useConfiguracion()
  if (!resumen.data) return null

  const texto = textoResumen({
    ...resumen.data,
    nota: jornada.nota_cierre,
    productos: planilla.data ?? [],
  })
  return (
    <a
      href={enlaceWhatsapp(config.data?.whatsapp_dueno, texto)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-borde-fuerte bg-superficie font-bold shadow-tarjeta hover:bg-hundida"
    >
      <MessageCircle className="size-5" aria-hidden="true" /> Mandar resumen por WhatsApp
    </a>
  )
}
