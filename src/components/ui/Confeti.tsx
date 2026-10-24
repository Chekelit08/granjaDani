import type { CSSProperties } from 'react'

const COLORES = ['bg-marca', 'bg-acento', 'bg-mp', 'bg-ok', 'bg-grafico-ingresos']

/** Papelitos que caen una vez (por ejemplo, al cerrar el día con la caja justa). Decorativo. */
export function Confeti({ cantidad = 36 }: { cantidad?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden"
    >
      {Array.from({ length: cantidad }, (_, i) => {
        // Valores fijos por índice: el mismo dibujo cada vez, sin Math.random en el render.
        const izquierda = (i * 37) % 100
        const demora = (i % 9) * 0.09
        const deriva = ((i * 53) % 120) - 60
        const giro = 360 + ((i * 71) % 360)
        const estilo = {
          left: `${izquierda}%`,
          animationDelay: `${demora}s`,
          '--deriva': `${deriva}px`,
          '--giro': `${giro}deg`,
        } as CSSProperties
        return (
          <span
            key={i}
            style={estilo}
            className={`absolute top-0 h-3 w-2 animate-confeti rounded-[2px] opacity-0 ${COLORES[i % COLORES.length]}`}
          />
        )
      })}
    </div>
  )
}
