import { useEffect, useRef, useState } from 'react'

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Número que "cuenta" hasta el valor nuevo (por ejemplo, el total del día al cargar una venta).
 * Si la persona pidió menos movimiento en su sistema, salta directo.
 */
export function useNumeroAnimado(valor: number, duracion = 600): number {
  const [mostrado, setMostrado] = useState(valor)
  const desde = useRef(valor)

  useEffect(() => {
    const inicio = desde.current
    if (inicio === valor || prefiereMenosMovimiento()) {
      desde.current = valor
      setMostrado(valor)
      return
    }
    let cuadro = 0
    const t0 = performance.now()
    const paso = (t: number) => {
      const avance = Math.min(1, (t - t0) / duracion)
      const suave = 1 - Math.pow(1 - avance, 3)
      const actual = Math.round(inicio + (valor - inicio) * suave)
      setMostrado(actual)
      desde.current = actual
      if (avance < 1) cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [valor, duracion])

  return mostrado
}
