# Granja Los Amigos

App web que reemplaza la **planilla del día** en papel de una granja/pollería: por cada producto, Kg · $ · EFE · MP. Registra ventas por producto (kilos o unidades, importe y medio de pago), cierra el día con arqueo de efectivo y, para el dueño, muestra la planilla de cualquier período, gráficos, precios, egresos y auditoría. La usan personas no técnicas, de pie y con apuro: **si algo frena el mostrador, está mal.**

Nació como copia de Avícola GD (repo `avicolGD`, rama `claude/pensive-clarke-uvekje`): mismo stack y mismas reglas de caja, pero con carga por producto y otro diseño. Las migraciones son nuevas (consolidadas), no las de GD.

## Stack (todo en planes gratuitos)

- React 19 + TypeScript (estricto) + Vite 8, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Recharts, date-fns + `@date-fns/tz`, vite-plugin-pwa.
- Supabase: Postgres + Auth + RLS + Edge Function `usuarios`. No hay servidor propio.
- Hosting: Vercel (`vercel.json`); también sirve Cloudflare Pages (`public/_redirects`, `public/_headers`).
- Exportar: jsPDF + jspdf-autotable, write-excel-file (se cargan con `import()` solo al usarlos).
- Tests: Vitest (`src/**/*.test.ts`), pgTAP (`supabase/tests`), Playwright (`e2e/`).

## Comandos

```bash
npm install
npx supabase start          # base local (Docker)
npx supabase db reset       # migraciones + seed (precios y 60 días)
npx supabase functions serve
npm run dev                 # http://localhost:5173
npm run lint && npm run format:check
npm test                    # Vitest
npm run test:db             # pgTAP (requiere db reset reciente: el seed deja hoy sin abrir)
npm run test:e2e            # Playwright; compila y levanta vite preview solo
npm run build
npm run db:tipos            # regenera src/lib/tipos-db.ts después de cambiar migraciones
```

En la nube de Claude Code: `PLAYWRIGHT_CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e` y nunca `playwright install`. Sin Docker, `src/lib/tipos-db.ts` se puede escribir respetando el formato de `supabase gen types`.

Publicada en https://granja-los-amigos.vercel.app; Supabase `aotiojmkvlxtyzpqodru` (São Paulo). Datos y pasos en `docs/DESPLIEGUE.md`.

## Reglas de negocio (no negociables)

1. Una sola jornada abierta a la vez (índice único). Si quedó abierta una de un día anterior, hay que cerrarla antes de abrir otra o cargar ventas.
2. Las ventas solo se cargan en la jornada abierta **de hoy** (`registrar_ticket`). Una jornada cerrada queda bloqueada por trigger; solo un admin la reabre (`reabrir_jornada`, auditado).
3. **Medio de pago: `efectivo` | `mercadopago`** (EFE y MP, como la planilla). Igual en ventas y egresos.
4. **Una venta = un ticket** con uno o más productos (`ventas.ticket_id`); cada fila de `ventas` es un producto con `cantidad` (kg o unidades, opcional, 3 decimales), `precio_unitario` (el que tenía el producto) e `importe` (pesos enteros en la carga). El medio es uno por ticket.
5. **El medio se elige siempre** y elegirlo guarda el ticket: **Enter = Efectivo**, **+ = Mercado Pago**; **−** abre "Sacar efectivo"; **Esc** borra el producto en curso (y otra vez, el ticket). Letras = elegir producto por el nombre (`buscarProducto`); números = kilos; **Tab** = importe a mano. No hay medio preseleccionado.
6. Con precio, importe = kilos × precio redondeado al peso; si se tipea el importe, los kilos salen del precio (solo productos por kg). Sin precio, el importe se escribe. Lógica en `src/lib/ticket.ts`.
7. Las ventas, salidas y egresos no se borran, se anulan con motivo. Un cajero anula lo de su cuenta con menos de 10 minutos; después, solo admin. En la caja se anula el ticket entero (`anular_ticket`).
8. Importe > 0 y ≤ $ 9.999.999 por producto y por ticket. Arriba de `configuracion.tope_confirmacion` ($ 300.000) se pide confirmación. Validar en cliente **y** en la base.
9. Efectivo esperado = fondo inicial + ventas en efectivo no anuladas − salidas de caja no anuladas (`efectivo_esperado()`). Diferencia = contado − esperado.
10. Los totales los calcula la base: `resumen_jornada`, `planilla_jornada` (la hoja del día), `planilla_periodo` y el resto en `20261024000003_reportes.sql`.
11. Productos: los ve todo usuario activo; los crea y edita el admin (no se borran, se desactivan). Cambios de precio auditados.
12. Roles: `cajero` (cuenta compartida "Mostrador") y `admin`. Permisos con RLS; el cajero no ve egresos, historial, precios para editar ni usuarios. Siempre queda al menos un admin activo.
13. Auditoría: solo se agrega (trigger bloquea update/delete). Se llena con triggers.

Fuera de alcance por ahora: stock/inventario, facturación ARCA/AFIP, impresora fiscal, cobros por la API de Mercado Pago, fiado, apps nativas.

## Convenciones

- Código, tablas, variables y commits **en español** (`jornadas`, `formatearPesos`, `medioPago`).
- Interfaz en español rioplatense con "vos". Mismo vocabulario en toda la app (Efectivo / Mercado Pago, EFE / MP en la planilla). Los errores de reglas los escribe la base (`raise exception … using errcode = 'P0001'`) y la app los muestra tal cual (`mensajeDeError`).
- Montos: `numeric(12,2)` en la base, nunca float; kilos `numeric(10,3)`. En pantalla: `formatearPesos()`, `formatearCantidad()` y la clase `cifras` (tabular-nums).
- Fechas en `America/Argentina/Buenos_Aires`: `fechaDeTrabajo()` en el cliente, `hoy_ar()` en la base.
- Colores: solo tokens de `src/styles/app.css`. Marca del logo: rojo (`--rojo`), amarillo (`--amarillo`), blanco, y `--papel` / `--tinta` (el crema y el marrón del logo: el logo siempre va sobre `--papel`). Efectivo = verde, Mercado Pago = azul (no son colores de marca); en gráficos `--grafico-*` (validados con la skill dataviz). Nunca hex sueltos en componentes.
- Diseño propio (distinto de GD): encabezado tipo cartel (franja `--papel` con el logo + cinta roja con las pestañas; no barra lateral), **Plus Jakarta Sans** (`font-texto`), fondo blanco cálido, tarjetas `rounded-tarjeta`, títulos `font-extrabold`, íconos `lucide-react`. Componentes base en `src/components/ui/`. Elemento firma: la **Planilla** en casilleros (`src/components/caja/Planilla.tsx`).
- Teclado primero en la compu, y que ande en celular. Objetivos ≥ 44 px, foco visible, contraste AA, `prefers-reduced-motion`.
- Sin `any`. Prettier: sin punto y coma, comillas simples, 100 columnas. Las páginas de admin se cargan con `lazy()`.
- Migraciones versionadas en `supabase/migrations/`, RLS en todas las tablas, tests pgTAP para cada regla nueva.
- Commits chicos en español. Decisiones importantes a `docs/DECISIONES.md`.

## Seguridad: nunca subir claves

- En el cliente va **solo** la clave pública (anon/publishable) vía `.env.local`. `.env.example` documenta las variables.
- **Jamás** la `service_role` en el front, en el repo, en commits ni en logs. Solo en la Edge Function y en `.env.servidor` (ignorado) para `scripts/`.
- `.env.*` y `backups/` están ignorados por git.
