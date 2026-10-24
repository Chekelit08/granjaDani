# Decisiones

Cada decisión importante, con su motivo. La más reciente va abajo de su sección.

## Base (24/10/2026)

### Partir de Avícola GD

**Decisión:** la app copia el stack, la seguridad y las reglas de caja de Avícola GD (abrir/cerrar el día, arqueo, salidas de efectivo, anulaciones con motivo, roles, auditoría, PWA, exportación al contador). Todas esas decisiones se mantienen; las que cambian están abajo.
**Por qué:** ya están probadas en un local real, y un software "parecido pero más ordenado" no tiene por qué reinventar la caja.
**Diferencias con GD:** migraciones consolidadas desde cero (no el historial de GD), sin la integración con la API de Mercado Pago, sin la sección Personal (los sueldos van como egreso, categoría "Sueldos") y sin la página de muestra de estilos.

### Ventas por producto, como la planilla de papel

**Decisión:** cada venta lleva producto, kilos (o unidades) e importe. La tabla `productos` tiene las 13 columnas de la planilla del día (Milanesa … Menudo) en el mismo orden, editables por el admin. `planilla_jornada` y `planilla_periodo` devuelven, por producto, Kg · $ · EFE · MP.
**Por qué:** el dueño ya lleva la planilla así; la app tiene que dar exactamente esa hoja, pero sola y sin errores de suma.

### Ticket: varios productos, un medio de pago

**Decisión:** lo que un cliente paga junto es un **ticket** (`ventas.ticket_id`): una fila por producto y un solo medio. `registrar_ticket(medio, items)` lo guarda en una transacción; `anular_ticket` lo anula entero.
**Por qué:** en el mostrador el cliente lleva milanesa y papa y paga una vez. Separar por producto mantiene la planilla exacta; agrupar por ticket mantiene el vuelto, el ticket promedio y la anulación como los piensa el cajero.
**Costo:** no se puede pagar un mismo ticket mitad efectivo y mitad Mercado Pago. Si pasa, se cargan dos tickets.

### Medio de pago: Efectivo o Mercado Pago

**Decisión:** el enum es `efectivo | mercadopago` (EFE y MP, como la planilla), en ventas y egresos.
**Por qué:** son las dos columnas de la hoja. Una transferencia o tarjeta, si aparece, entra como Mercado Pago (lo que no es efectivo no entra al arqueo).

### Carga con el teclado: letras = producto, números = kilos

**Decisión:** con el cursor en **Kilos**, las letras eligen el producto por el principio del nombre (`mi` → Milanesa, `pap` → Papa, `mus` → Pata y muslo); si había otro producto completo en curso, pasa al ticket. Los números son kilos con coma. **Tab** va al importe. **Enter** = Efectivo, **+** = Mercado Pago, **−** = sacar efectivo, **Esc** = borrar. Con el mouse o en el celular se toca el producto y el botón.
**Por qué:** no hace falta memorizar atajos: se escribe lo que se dice ("milanesa uno y medio"). Una venta de dos productos son unas 10 teclas sin tocar el mouse.
**Detalle:** si se elige el producto tipeando, el cursor no se mueve (antes un Tab rápido podía volver a Kilos).

### Precio por producto, opcional

**Decisión:** `productos.precio` (por kilo o por unidad) es opcional. Con precio, importe = kilos × precio redondeado al peso, y si se tipea el importe los kilos salen solos. Sin precio, se escribe el importe. La venta guarda `precio_unitario` para que cambiar un precio no altere el pasado. Los cambios de precio quedan en la auditoría.
**Por qué:** los precios cambian seguido; con precio cargado el mostrador va más rápido y la planilla tiene los kilos aunque se venda "por plata".

### Huevo por unidad

**Decisión:** cada producto es `kg` o `unidad`. El huevo arranca por unidad; los kilos del día suman solo productos por kg.
**Por qué:** sumar huevos con kilos de pollo no significa nada. Si se venden por maple, se cambia el nombre ("Huevo (maple)") y el precio.

### Tope de confirmación en $ 300.000

Por ticket. En una pollería un ticket normal es bastante menor que en una carnicería; un cero de más se nota antes.

## Diseño (24/10/2026)

### Otro diseño, misma comodidad

- **Encabezado tipo cartel:** franja crema con el logo y, abajo, la cinta roja con las pestañas (GD usa barra lateral gris). En celular las pestañas se deslizan.
- **Plus Jakarta Sans**, títulos en extra negrita; fondo blanco cálido; tarjetas más redondeadas (`rounded-tarjeta`).
- **Elemento firma: la planilla en casilleros.** Cada producto es un casillero como en la hoja de papel (Kg · $ arriba, EFE · MP abajo); los que no vendieron quedan punteados. También se ve como tabla con el total.
- **La caja de un vistazo:** total del día (rojo), Efectivo, Mercado Pago y Kilos vendidos; debajo, productos en grilla y el ticket a la derecha con los botones grandes.
- **Login partido:** el logo completo sobre su papel a la izquierda, el formulario a la derecha.

### Marca: logo de Granja Los Amigos (Estación de Moreno)

**Decisión:** el logo que pasó el dueño se mejoró con **Magnific** (Precision "sublime", 4x, sin grano: no inventa detalle, así las letras no se deforman) y quedó en `brand/logo-granja-los-amigos.png`. De ahí salen:

- `brand/logo-cinta.png` → `src/assets/logo-cinta.webp`: "GRANJA · LOS AMIGOS", para el encabezado.
- `src/assets/logo-completo.webp`: el logo entero, para el login.
- `brand/gallo.png`: el gallo del logo, limpio y con el trazo en el marrón del logo, para el ícono de la app y el favicon (`node scripts/generar-iconos.mjs`).

El fondo del logo es papel crema, no transparente: recortarlo dejaba manchas y las letras blancas de la cinta se perdían. Por eso el logo siempre va sobre **`--papel`** (`#f5f2eb`, el mismo crema), en claro y en oscuro, como un cartel.

**Colores** (rojo, amarillo y blanco, como pidió el dueño):

| Token        | Hex       | Uso                                                                    |
| ------------ | --------- | ---------------------------------------------------------------------- |
| `--rojo`     | `#cc3430` | marca: la cinta del encabezado, botones principales, total del día     |
| `--amarillo` | `#f4b52c` | acento: pestaña activa, producto elegido, "+ $" al vender, avatar      |
| `--papel`    | `#f5f2eb` | el fondo del logo: franja del encabezado y panel del login             |
| `--tinta`    | `#3d2b20` | el marrón de las letras del logo: texto sobre `--papel`                |
| `--texto`    | `#2e211a` | texto general (marrón muy oscuro en vez de negro, combina con el logo) |

El rojo y el amarillo salen del logo (el rojo, medido en la cinta); el amarillo no está en el logo y se eligió dorado para que combine con el rojo y el marrón. Blanco con rojo da 5,1:1 de contraste (AA).
Efectivo (verde) y Mercado Pago (azul) **no** cambian con la marca: son colores de medio de pago, y el rojo se reserva para la marca.

### Paleta de gráficos

Validada con el script de la skill dataviz (banda de luminosidad, croma, separación para daltonismo, contraste ≥ 3:1), en claro (sobre `#ffffff`) y oscuro (sobre `#17191a`). Cada color significa siempre lo mismo:

| Serie         | Claro     | Oscuro    |
| ------------- | --------- | --------- |
| Efectivo      | `#2f8a4e` | `#3fa564` |
| Mercado Pago  | `#2b7bd0` | `#4a92e0` |
| Ingresos      | `#6a4fc9` | `#8a74e6` |
| Egresos       | `#d0612a` | `#d0612a` |
| Producto (\*) | `#b97c0c` | `#b98418` |

(\*) Serie única de "Ventas por producto". No depende de la marca. El oscuro se volvió a validar sobre la superficie oscura nueva (`#1d1815`).
