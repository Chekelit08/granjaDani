# Granja Los Amigos

La **planilla del día** de una granja/pollería, sin papel. Cada venta se carga por producto (Milanesa, Pata y muslo, Alitas, Pechuga, Trozado, Congelado, Huevo, Pollo, Papa, Cebolla, Pan rallado, B. horno y condimento, Menudo…) con sus **kilos** y el medio de pago (**Efectivo** o **Mercado Pago**), y la planilla Kg · $ · EFE · MP se arma sola.

- **Mostrador (cajero):** abrir el día, cargar tickets de uno o varios productos con el teclado (`mi` `1,5` Enter), anular, sacar efectivo y cerrar con arqueo.
- **Dueño (admin):** planilla por producto de cualquier día, semana o mes, panel con gráficos (ventas por producto, por día, por hora), productos y precios, egresos, usuarios, auditoría y exportación a PDF/Excel para el contador.
- PWA instalable, modo claro y oscuro, anda en compu y en celular.

Basada en el software de Avícola GD (mismo stack y reglas de caja), con otro diseño y la carga por producto.
Con el logo de **Granja Los Amigos (Estación de Moreno)**, mejorado con Magnific, y sus colores: rojo, amarillo y blanco (ver `docs/DECISIONES.md` → "Marca").

Todo corre en planes gratuitos: React + Vite en **Vercel** (o Cloudflare Pages), base y login en **Supabase** (Postgres con Row Level Security).

<img src="docs/capturas/03-caja.png" alt="La caja: productos, ticket y planilla del día" width="720">

## Para empezar (desarrollo)

```bash
npm install
npx supabase start            # base local (necesita Docker)
npx supabase db reset         # tablas + productos con precio + 60 días de datos de prueba
cp .env.example .env.local    # URL http://127.0.0.1:54321 y ANON_KEY de `npx supabase status`
npm run dev                   # http://localhost:5173
```

Usuarios de prueba (contraseña `granja-prueba-2026`): `dani` (admin), `mostrador` (cajero).

| Comando                                       | Qué hace                                                  |
| --------------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                                 | servidor de desarrollo                                    |
| `npm test`                                    | tests de lógica (Vitest)                                  |
| `npm run test:db`                             | tests de la base y de RLS (pgTAP)                         |
| `npm run test:e2e`                            | tests de punta a punta (Playwright, contra la base local) |
| `npm run lint` / `npm run format`             | ESLint / Prettier                                         |
| `npm run build`                               | build de producción en `dist/`                            |
| `npm run db:tipos`                            | regenera los tipos de TypeScript desde la base local      |
| `node scripts/backup.mjs`                     | exporta la base a CSV/JSON                                |
| `node scripts/crear-admin.mjs "Nombre" email` | crea el primer administrador                              |
| `node scripts/generar-iconos.mjs`             | íconos de la app a partir de `brand/`                     |

## Documentación

- [`docs/GUIA-DUENO.md`](docs/GUIA-DUENO.md): guía de uso, con capturas.
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): publicar en Supabase + Vercel.
- [`docs/PUESTA-EN-MARCHA.md`](docs/PUESTA-EN-MARCHA.md): checklist para el primer día.
- [`docs/BACKUP.md`](docs/BACKUP.md): cómo hacer y guardar backups.
- [`docs/LIMITES.md`](docs/LIMITES.md): límites de los planes gratuitos.
- [`docs/DECISIONES.md`](docs/DECISIONES.md): decisiones y por qué se tomaron.
- [`CLAUDE.md`](CLAUDE.md): stack, reglas de negocio y convenciones.

## Estructura

```
src/
  pages/            Caja, CerrarDia, Ingresar… y admin/ (Consulta, Panel, Productos, Egresos, Usuarios, Auditoria, Ajustes)
  components/       caja/ (CargaTicket, Planilla, ListaTickets…), graficos/, ui/, marco/
  datos/            consultas y mutaciones (TanStack Query)
  lib/              lógica pura con tests: ticket (kilos ↔ importe, elegir producto), caja, formato, períodos…
  exportar/         resumen mensual a PDF y Excel (se carga solo al usarlo)
supabase/
  migrations/       esquema, RLS, operaciones de la caja y reportes
  tests/            tests pgTAP (RLS y reglas de negocio)
  functions/        Edge Function `usuarios` (crear/bloquear cuentas)
  seed.sql          datos de prueba (solo local)
brand/              logo en alta (mejorado con Magnific), la cinta y el gallo del ícono
scripts/            backup, primer admin, íconos, vaciar pruebas
e2e/                tests de Playwright
```

## Seguridad

En el navegador va solo la clave pública de Supabase. La `service_role` vive únicamente en la Edge Function (la inyecta Supabase) y en `.env.servidor` en tu compu, para los scripts; nunca en el repo ni en el front. Los permisos se aplican en la base con Row Level Security y están probados con tests.
