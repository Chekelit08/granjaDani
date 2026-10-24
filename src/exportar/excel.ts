import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import { leerFecha } from '../lib/periodos'
import { nombreArchivo, NOTA_ESTIMACION, type ResumenMensual } from './resumenMensual'

const PESOS = '"$" #,##0.00'
const FECHA = 'dd/mm/yyyy'
const KILOS = '#,##0.000'
const titulo = (t: string) => ({ value: t, fontWeight: 'bold' as const })
const pesos = (n: number) => ({ value: n, format: PESOS })
const fecha = (f: string) => ({ value: leerFecha(f), format: FECHA, type: Date })

/** Resumen mensual en Excel: una hoja por tema, con montos como números (para sumar). */
export async function descargarExcel(r: ResumenMensual): Promise<void> {
  const resumen: SheetData = [
    [titulo(`Granja Dani — Resumen de ${r.titulo}`)],
    [],
    [titulo('Concepto'), titulo('Monto')],
    ['Ventas totales', pesos(r.ventas.total)],
    ['Ventas en efectivo', pesos(r.ventas.total_efectivo)],
    ['Ventas con Mercado Pago', pesos(r.ventas.total_mercadopago)],
    ['Kilos vendidos', { value: r.ventas.kilos, format: KILOS }],
    ['Cantidad de ventas', r.ventas.cantidad_tickets],
    ['Ticket promedio', pesos(r.ventas.ticket_promedio)],
    ['Días trabajados', r.ventas.dias_trabajados],
    ['Diferencia de caja acumulada', pesos(r.ventas.diferencia_caja)],
    ['Egresos', pesos(r.totalEgresos)],
    [titulo('Resultado aproximado'), { ...pesos(r.ganancia), fontWeight: 'bold' }],
    [],
    [NOTA_ESTIMACION],
  ]

  const dias: SheetData = [
    [
      titulo('Fecha'),
      titulo('Efectivo'),
      titulo('Mercado Pago'),
      titulo('Total'),
      titulo('Kilos'),
      titulo('Ventas'),
      titulo('Estado'),
    ],
    ...r.dias.map((d) => [
      fecha(d.fecha),
      pesos(d.total_efectivo),
      pesos(d.total_mercadopago),
      pesos(d.total),
      { value: d.kilos, format: KILOS },
      d.cantidad_tickets,
      d.trabajado ? 'Abierto' : 'Cerrado',
    ]),
  ]

  const egresos: SheetData = [
    [
      titulo('Fecha'),
      titulo('Categoría'),
      titulo('Detalle'),
      titulo('Proveedor'),
      titulo('Medio'),
      titulo('Monto'),
    ],
    ...r.egresos.map((e) => [
      fecha(e.fecha),
      e.categoria,
      e.descripcion,
      e.proveedor,
      e.medio,
      pesos(e.monto),
    ]),
  ]

  const productos: SheetData = [
    [
      titulo('Producto'),
      titulo('Unidad'),
      titulo('Cantidad'),
      titulo('Total'),
      titulo('Efectivo'),
      titulo('Mercado Pago'),
    ],
    ...r.productos.map((x) => [
      x.nombre,
      x.unidad === 'kg' ? 'kg' : 'unidad',
      { value: x.cantidad, format: KILOS },
      pesos(x.total),
      pesos(x.total_efectivo),
      pesos(x.total_mercadopago),
    ]),
  ]

  await writeXlsxFile([
    { data: resumen, sheet: 'Resumen', columns: [{ width: 36 }, { width: 18 }] },
    {
      data: dias,
      sheet: 'Ventas por día',
      columns: [
        { width: 12 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 10 },
        { width: 8 },
        { width: 10 },
      ],
      stickyRowsCount: 1,
    },
    {
      data: productos,
      sheet: 'Planilla por producto',
      columns: [
        { width: 24 },
        { width: 10 },
        { width: 12 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
      ],
      stickyRowsCount: 1,
    },
    {
      data: egresos,
      sheet: 'Egresos',
      columns: [
        { width: 12 },
        { width: 16 },
        { width: 32 },
        { width: 22 },
        { width: 10 },
        { width: 16 },
      ],
      stickyRowsCount: 1,
    },
  ]).toFile(nombreArchivo(r, 'xlsx'))
}
