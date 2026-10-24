import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ConSesion, SoloAdmin } from './components/marco/Guardias'
import { Marco } from './components/marco/Marco'
import { Cargando } from './components/ui/Estados'
import { supabaseConfigurado } from './lib/supabase'
import { Caja } from './pages/Caja'
import { CerrarDia } from './pages/CerrarDia'
import { Ingresar } from './pages/Ingresar'
import { NuevaClave } from './pages/NuevaClave'
import { Recuperar } from './pages/Recuperar'
import { ProveedorSesion } from './sesion/Sesion'

// Las pantallas de admin se cargan aparte: la caja tiene que abrir rápido en un celular viejo.
const Consulta = lazy(() => import('./pages/admin/Consulta'))
const Panel = lazy(() => import('./pages/admin/Panel'))
const Productos = lazy(() => import('./pages/admin/Productos'))
const Egresos = lazy(() => import('./pages/admin/Egresos'))
const Usuarios = lazy(() => import('./pages/admin/Usuarios'))
const Auditoria = lazy(() => import('./pages/admin/Auditoria'))
const Ajustes = lazy(() => import('./pages/admin/Ajustes'))

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 },
    mutations: { retry: false },
  },
})

function FaltaConfigurar() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">Falta configurar Supabase</h1>
      <p>
        Copiá <code>.env.example</code> como <code>.env.local</code>, completá la URL y la clave
        pública, y volvé a iniciar la app. Los pasos están en <code>docs/SUPABASE.md</code>.
      </p>
    </main>
  )
}

export function App() {
  if (!supabaseConfigurado()) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<FaltaConfigurar />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <BrowserRouter>
          <Suspense fallback={<Cargando />}>
            <Routes>
              <Route path="/ingresar" element={<Ingresar />} />
              <Route path="/recuperar" element={<Recuperar />} />
              <Route path="/nueva-clave" element={<NuevaClave />} />
              <Route element={<ConSesion />}>
                <Route element={<Marco />}>
                  <Route index element={<Caja />} />
                  <Route path="cerrar" element={<CerrarDia />} />
                  <Route element={<SoloAdmin />}>
                    <Route path="consulta" element={<Consulta />} />
                    <Route path="panel" element={<Panel />} />
                    <Route path="productos" element={<Productos />} />
                    <Route path="egresos" element={<Egresos />} />
                    <Route path="usuarios" element={<Usuarios />} />
                    <Route path="auditoria" element={<Auditoria />} />
                    <Route path="ajustes" element={<Ajustes />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ProveedorSesion>
    </QueryClientProvider>
  )
}
