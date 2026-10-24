import {
  BarChart3,
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Package,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import logo from '../../assets/logo-cinta.webp'
import { useTema, type Tema } from '../../lib/tema'
import { useSesion } from '../../sesion/Sesion'

interface Seccion {
  a: string
  texto: string
  Icono: LucideIcon
  soloAdmin?: boolean
}

const SECCIONES: Seccion[] = [
  { a: '/', texto: 'Caja', Icono: Store },
  { a: '/consulta', texto: 'Consulta', Icono: Search, soloAdmin: true },
  { a: '/panel', texto: 'Panel', Icono: BarChart3, soloAdmin: true },
  { a: '/productos', texto: 'Productos', Icono: Package, soloAdmin: true },
  { a: '/egresos', texto: 'Egresos', Icono: Receipt, soloAdmin: true },
  { a: '/usuarios', texto: 'Usuarios', Icono: UserCog, soloAdmin: true },
  { a: '/auditoria', texto: 'Auditoría', Icono: ShieldCheck, soloAdmin: true },
  { a: '/ajustes', texto: 'Ajustes', Icono: Settings, soloAdmin: true },
]

const TEMAS: Record<Tema, { siguiente: Tema; texto: string; Icono: LucideIcon }> = {
  sistema: { siguiente: 'claro', texto: 'Tema automático', Icono: Monitor },
  claro: { siguiente: 'oscuro', texto: 'Tema claro', Icono: Sun },
  oscuro: { siguiente: 'sistema', texto: 'Tema oscuro', Icono: Moon },
}

/** El logo de la granja (la parte "GRANJA · LOS AMIGOS"), sobre su mismo color de papel. */
function Marca() {
  return (
    <img
      src={logo}
      alt="Granja Los Amigos"
      width={720}
      height={213}
      className="h-12 w-auto sm:h-14"
    />
  )
}

/** Pestañas de secciones. En celular se deslizan de costado. */
function Pestanas() {
  const { esAdmin } = useSesion()
  const secciones = SECCIONES.filter((s) => esAdmin || !s.soloAdmin)
  if (secciones.length < 2) return null
  return (
    <nav aria-label="Secciones" className="mx-auto max-w-6xl px-2 sm:px-4 lg:px-6">
      <ul className="-mb-px flex [scrollbar-width:none] gap-1 overflow-x-auto">
        {secciones.map(({ a, texto, Icono }) => (
          <li key={a} className="shrink-0">
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-acento text-sobre-marca'
                    : 'border-transparent text-sobre-marca/80 hover:border-sobre-marca/40 hover:text-sobre-marca'
                }`
              }
            >
              <Icono className="size-4" aria-hidden="true" />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Usuario, tema y salir, en un menú desplegable. */
function MenuUsuario() {
  const { perfil, cerrarSesion } = useSesion()
  const [tema, setTema] = useTema()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const { siguiente, texto, Icono } = TEMAS[tema]

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !caja.current?.contains(e.target as Node)
      )
        setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [abierto])

  const opcion =
    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-texto hover:bg-hundida'

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-2 pl-1 text-tinta hover:bg-tinta/8"
      >
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-acento text-sm font-bold text-sobre-acento"
        >
          {(perfil?.nombre ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-32 truncate text-sm font-semibold">{perfil?.nombre}</span>
          <span className="block text-xs text-tinta/70">
            {perfil?.rol === 'admin' ? 'Dueño' : 'Mostrador'}
          </span>
        </span>
        <ChevronDown className="size-4 text-tinta/70" aria-hidden="true" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-56 animate-aparecer rounded-2xl border border-borde bg-superficie p-1.5 text-texto shadow-alta"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => setTema(siguiente)}
            className={opcion}
          >
            <Icono className="size-[18px] text-suave" aria-hidden="true" /> {texto}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void cerrarSesion()}
            className={opcion}
          >
            <LogOut className="size-[18px] text-suave" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export function Marco() {
  const ubicacion = useLocation()

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only rounded-lg bg-marca px-3 py-2 text-sobre-marca focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Ir al contenido
      </a>

      <header className="sticky top-0 z-40 shadow-alta">
        <div className="bg-papel">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
            <Marca />
            <MenuUsuario />
          </div>
        </div>
        {/* La cinta roja del logo: lleva las pestañas (o queda como franja fina para el mostrador). */}
        <div className="min-h-1.5 bg-marca text-sobre-marca">
          <Pestanas />
        </div>
      </header>

      <main
        id="contenido"
        key={ubicacion.pathname}
        className="mx-auto max-w-6xl animate-pagina px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
