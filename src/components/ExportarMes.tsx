import { useState } from 'react'
import { mensajeDeError } from '../lib/errores'
import { Boton } from './ui/Boton'

/** Descarga el resumen del mes para el contador. Las librerías se cargan recién al tocar. */
export function ExportarMes({ fecha }: { fecha: string }) {
  const [generando, setGenerando] = useState<'pdf' | 'xlsx' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exportar = async (tipo: 'pdf' | 'xlsx') => {
    setGenerando(tipo)
    setError(null)
    try {
      const { cargarResumenMensual } = await import('../exportar/resumenMensual')
      const resumen = await cargarResumenMensual(fecha)
      if (tipo === 'pdf') (await import('../exportar/pdf')).descargarPdf(resumen)
      else await (await import('../exportar/excel')).descargarExcel(resumen)
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setGenerando(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="secundario"
          cargando={generando === 'pdf'}
          disabled={generando !== null}
          onClick={() => void exportar('pdf')}
        >
          Descargar PDF para el contador
        </Boton>
        <Boton
          variante="secundario"
          cargando={generando === 'xlsx'}
          disabled={generando !== null}
          onClick={() => void exportar('xlsx')}
        >
          Descargar Excel
        </Boton>
      </div>
      {error && (
        <p role="alert" className="font-semibold text-alerta-texto">
          {error}
        </p>
      )}
    </div>
  )
}
