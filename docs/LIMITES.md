# Límites de los planes gratuitos

Valores de referencia a octubre de 2026. **Cambian seguido: verificalos en la página oficial** antes de la puesta en marcha y una vez por año.

## Supabase (Free) — <https://supabase.com/pricing>

| Recurso                  | Límite aprox.                         | Cuánto usa Granja Dani                        | Si se supera                                             |
| ------------------------ | ------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Base de datos            | 500 MB                                | ~10–20 MB por año (100 ventas por día)        | Pasa a solo lectura hasta liberar espacio o pasar a pago |
| Usuarios activos por mes | 50.000                                | 3 a 5                                         | —                                                        |
| Transferencia (egress)   | 5 GB/mes                              | muy poco (solo datos, la app la sirve Vercel) | Se limita el servicio hasta el mes siguiente             |
| Edge Functions           | 500.000 invocaciones/mes              | unas pocas (solo al gestionar usuarios)       | Se cortan hasta el mes siguiente                         |
| Inactividad              | pausa tras ~1 semana sin uso          | con uso diario, no aplica                     | Se reactiva a mano desde el panel; los datos quedan      |
| Backups                  | sin backups descargables garantizados | —                                             | Usar `scripts/backup.mjs` (ver `BACKUP.md`)              |
| Proyectos                | 2 gratuitos por cuenta                | 1                                             | —                                                        |

## Cloudflare Pages (Free) — <https://developers.cloudflare.com/pages/platform/limits/>

| Recurso                                       | Límite aprox. | Uso                   | Si se supera                                                            |
| --------------------------------------------- | ------------- | --------------------- | ----------------------------------------------------------------------- |
| Builds                                        | 500 por mes   | uno por cada push     | No se publica hasta el mes siguiente; la versión anterior sigue andando |
| Ancho de banda y visitas a archivos estáticos | sin límite    | —                     | —                                                                       |
| Archivos por sitio                            | 20.000        | ~50                   | —                                                                       |
| Tamaño por archivo                            | 25 MiB        | el más grande ~0,5 MB | —                                                                       |

## GitHub (Free)

Repositorio privado sin costo. Sin límites relevantes para este proyecto.

## En resumen

Con el volumen de una granja de barrio, la app entra holgada en los planes gratuitos durante muchos años. El único riesgo real es la **pausa por inactividad** de Supabase y la **falta de backups automáticos**: los dos se cubren con el uso diario y un backup semanal.
