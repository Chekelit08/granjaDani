import { useEffect, useState } from 'react'

export type Tema = 'sistema' | 'claro' | 'oscuro'
const CLAVE = 'granja.tema'

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE)
    return t === 'claro' || t === 'oscuro' ? t : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Tema elegido por la persona en este dispositivo (public/tema.js lo aplica antes de pintar). */
export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState<Tema>(leer)
  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'sistema') raiz.removeAttribute('data-tema')
    else raiz.setAttribute('data-tema', tema)
    try {
      if (tema === 'sistema') localStorage.removeItem(CLAVE)
      else localStorage.setItem(CLAVE, tema)
    } catch {
      // sin almacenamiento: vale solo para esta sesión
    }
  }, [tema])
  return [tema, setTema]
}
