# Despliegue (todo gratis)

Base y login en **Supabase**, la app en **Vercel** (o Cloudflare Pages). Son unos 30 minutos la primera vez. Es el mismo esquema que Avícola GD, en un proyecto **aparte** (otra base, otros usuarios).

## 1. Supabase

1. Creá el proyecto siguiendo [`SUPABASE.md`](SUPABASE.md) (nombre `granja-dani`, São Paulo, plan Free).
2. Desde tu compu, en la carpeta del repo:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU-PROJECT-REF
   npx supabase db push                     # tablas, reglas, productos de la planilla y reportes
   npx supabase functions deploy usuarios   # crear cuentas y cambiar contraseñas desde la app
   node scripts/crear-admin.mjs "Dani" email@ejemplo.com   # con .env.servidor (ver BACKUP.md)
   ```

   `db push` **no** carga los datos de prueba (`seed.sql` es solo para desarrollo local). Los 13 productos de la planilla sí quedan creados, **sin precio**: cargalos en **Productos**.

3. En el panel de Supabase:
   - **Authentication → Sign In / Providers**: apagá **Allow new users to sign up**. (Igual, una cuenta auto-registrada nace inactiva.)
   - **Authentication → Passwords**: largo mínimo **10**.
   - **Authentication → URL Configuration**: _Site URL_ = la dirección de la app y _Redirect URLs_ = `<dirección>/nueva-clave`.

## 2. Vercel

1. En <https://vercel.com> → **Add New → Project** → importá el repo `granjaDani`.
2. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la **pública**).
3. **Deploy.** `vercel.json` ya define el build (`npm run build` → `dist`), las rutas y las cabeceras de seguridad. Cada push a la rama principal publica solo.

### Alternativa: Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, build `npm run build`, salida `dist`, las mismas dos variables y `NODE_VERSION` = `22`. `public/_redirects` y `public/_headers` ya están.

## 3. Instalar la app en el local

- **Android (Chrome):** abrí la dirección → menú ⋮ → **Instalar app**.
- **iPhone (Safari):** Compartir → **Agregar a inicio**.
- **Compu (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Iniciá sesión con la cuenta **Mostrador** y dejala abierta.

## 4. Verificar

Seguí el checklist de [`PUESTA-EN-MARCHA.md`](PUESTA-EN-MARCHA.md).

## Desarrollo local

```bash
npx supabase start           # necesita Docker
npx supabase db reset        # migraciones + 60 días de datos de prueba con precios
npx supabase functions serve # (otra terminal) la función de usuarios
cp .env.example .env.local   # URL http://127.0.0.1:54321 y la ANON_KEY de `npx supabase status`
npm run dev
```

Usuarios de prueba locales (contraseña `granja-prueba-2026`): `dani` (admin) y `mostrador` (cajero).
