/** Grupo de opciones excluyentes (radio) con aspecto de botones. */
export function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta: string
  opciones: { valor: T; texto: React.ReactNode }[]
  valor: T | null
  onCambio: (v: T) => void
}) {
  return (
    <fieldset className="inline-flex flex-wrap gap-0.5 rounded-xl bg-hundida p-1">
      <legend className="sr-only">{etiqueta}</legend>
      {opciones.map((o) => (
        <label
          key={o.valor}
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-suave transition-colors hover:text-texto has-checked:bg-superficie has-checked:text-texto has-checked:shadow-tarjeta has-focus-visible:outline-2 has-focus-visible:outline-foco"
        >
          <input
            type="radio"
            className="sr-only"
            checked={valor === o.valor}
            onChange={() => onCambio(o.valor)}
          />
          {o.texto}
        </label>
      ))}
    </fieldset>
  )
}
