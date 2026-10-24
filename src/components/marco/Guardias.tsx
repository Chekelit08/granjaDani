import { Navigate, Outlet, useLocation } from 'react-router'
import { useSesion } from '../../sesion/Sesion'
import { Cargando, Vacio } from '../ui/Estados'

/** Exige sesión iniciada. Si la clave es temporal, obliga a cambiarla primero. */
export function ConSesion() {
  const { cargando, sesion, perfil } = useSesion()
  const ubicacion = useLocation()
  if (cargando || (sesion && !perfil)) return <Cargando />
  if (!sesion) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />
  if (perfil?.debe_cambiar_clave) return <Navigate to="/nueva-clave" replace />
  return <Outlet />
}

/** La interfaz esconde lo que no corresponde; la base igual lo bloquea con RLS. */
export function SoloAdmin() {
  const { esAdmin } = useSesion()
  if (!esAdmin) {
    return (
      <Vacio titulo="Esta sección es solo para administradores">
        Volvé a la caja para seguir cargando ventas.
      </Vacio>
    )
  }
  return <Outlet />
}
