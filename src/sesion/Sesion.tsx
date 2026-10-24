import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/tipos-db'
import { registrarActividad, vencioPorInactividad } from './inactividad'

export type Perfil = Database['public']['Tables']['perfiles']['Row']

interface EstadoSesion {
  cargando: boolean
  sesion: Session | null
  perfil: Perfil | null
  esAdmin: boolean
  /** Motivo por el que se cerró la sesión sola (inactividad, usuario desactivado). */
  aviso: string | null
  cerrarSesion: () => Promise<void>
  recargarPerfil: () => Promise<void>
}

const ContextoSesion = createContext<EstadoSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      return
    }
    const { data } = await supabase().from('perfiles').select('*').eq('id', s.user.id).maybeSingle()
    if (!data || !data.activo) {
      await supabase().auth.signOut()
      setAviso('Tu usuario está desactivado. Pedile a un administrador que lo revise.')
      setPerfil(null)
      setSesion(null)
      return
    }
    setPerfil(data)
  }, [])

  useEffect(() => {
    let vigente = true
    const cliente = supabase()

    cliente.auth.getSession().then(async ({ data }) => {
      if (!vigente) return
      if (data.session && vencioPorInactividad()) {
        await cliente.auth.signOut()
        setAviso('Se cerró la sesión porque pasaron más de 12 horas sin usar la app.')
        setCargando(false)
        return
      }
      setSesion(data.session)
      await cargarPerfil(data.session)
      if (vigente) setCargando(false)
    })

    const { data: suscripcion } = cliente.auth.onAuthStateChange((evento, nueva) => {
      if (evento === 'SIGNED_IN') registrarActividad()
      setSesion(nueva)
      if (evento === 'SIGNED_OUT') setPerfil(null)
      // Cargar el perfil fuera del callback evita bloquear al cliente de auth.
      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED')
        setTimeout(() => void cargarPerfil(nueva), 0)
    })

    const alUsar = () => registrarActividad()
    window.addEventListener('pointerdown', alUsar)
    window.addEventListener('keydown', alUsar)

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
      window.removeEventListener('pointerdown', alUsar)
      window.removeEventListener('keydown', alUsar)
    }
  }, [cargarPerfil])

  const valor = useMemo<EstadoSesion>(
    () => ({
      cargando,
      sesion,
      perfil,
      esAdmin: perfil?.rol === 'admin',
      aviso,
      cerrarSesion: async () => {
        setAviso(null)
        await supabase().auth.signOut()
      },
      recargarPerfil: () => cargarPerfil(sesion),
    }),
    [cargando, sesion, perfil, aviso, cargarPerfil],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion tiene que usarse dentro de <ProveedorSesion>')
  return valor
}
