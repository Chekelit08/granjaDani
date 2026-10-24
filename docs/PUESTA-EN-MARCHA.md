# Checklist de puesta en marcha

Marcá cada paso. Si alguno falla, frená y revisalo antes de seguir.

## Preparación

- [ ] Proyecto Supabase `granja-dani` creado, con migraciones y función `usuarios` ([`DESPLIEGUE.md`](DESPLIEGUE.md)).
- [ ] Auth: registro público **apagado**, contraseña mínima 10, Site URL y Redirect URL con la dirección de la app.
- [ ] Primer admin creado. Entrar y cambiar la contraseña temporal.
- [ ] App publicada con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la **pública**).
- [ ] Revisado que la _service_role key_ **no** está en el repo, ni en Vercel, ni en ningún chat.
- [ ] `.env.servidor` guardado solo en tu compu.

## Productos y precios (con el dueño)

- [ ] En **Productos**, revisar los 13 de la planilla (nombres, orden, kilo o unidad).
- [ ] Cargar el **precio por kilo** de cada uno (el huevo, por unidad).
- [ ] Agregar los que falten y marcar "No se vende" los que no se usen.

## Prueba completa (15 minutos)

- [ ] Desde **Usuarios**, crear la cuenta **Mostrador** (rol cajero).
- [ ] Entrar como Mostrador en el celular o la compu del local. **No** ve Consulta, Panel, Productos, Egresos ni Usuarios.
- [ ] Instalar la app (ícono del gallo).
- [ ] Abrir el día con un fondo de caja.
- [ ] Cargar 3 ventas con el teclado: `mi 1,5` Enter, `pap 2` + `hue 12` + (Mercado Pago), y una por importe (`pe`, Tab, `5000`, Enter).
- [ ] Ver que la **planilla del día** muestra Kg, $, EFE y MP de cada producto.
- [ ] Anular una venta con motivo: queda tachada y no suma.
- [ ] Probar con el wifi apagado: aparece "Sin internet" y la venta **no** se guarda.
- [ ] Cerrar el día: el arqueo da la diferencia correcta y el resumen de WhatsApp lista los productos.
- [ ] El dueño ve el día en **Consulta**, lo **reabre** y aparece en **Auditoría**. Volver a cerrarlo.
- [ ] Cambiar un precio y verlo en **Auditoría**.
- [ ] Descargar el PDF y el Excel del mes y abrirlos.
- [ ] Hacer el primer backup (`node scripts/backup.mjs`) y guardarlo en dos lugares.

## Primera semana

- [ ] Usar la app **y** la planilla de papel en paralelo 2 o 3 días, y comparar los totales por producto.
- [ ] Imprimir [`GUIA-DUENO.md`](GUIA-DUENO.md) y dejarla en el mostrador.
- [ ] Dejar de usar la planilla de papel. 🎉
- [ ] Agendar un backup semanal.
