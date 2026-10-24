import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatearFecha, formatearHora, formatearPesos } from '../lib/formato'
import {
  cifrasPrincipales,
  fechaLarga,
  filasDias,
  filasProductos,
  nombreArchivo,
  NOTA_ESTIMACION,
  type ResumenMensual,
} from './resumenMensual'

// Colores del logo (src/styles/app.css: --rojo y --tinta).
const ROJO: [number, number, number] = [204, 52, 48]
const TINTA: [number, number, number] = [61, 43, 32]

/** Resumen mensual en PDF (A4) para llevar al contador. */
export function descargarPdf(r: ResumenMensual): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const p = (n: number) => formatearPesos(n)

  doc.setFillColor(...ROJO)
  doc.rect(0, 0, ancho, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('GRANJA LOS AMIGOS', 14, 11)
  doc.setFontSize(12)
  doc.text(`Resumen de ${r.titulo}`, 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Del ${fechaLarga(r.desde)} al ${fechaLarga(r.hasta)}`, ancho - 14, 11, {
    align: 'right',
  })
  doc.text(
    `Generado el ${formatearFecha(r.generado)} ${formatearHora(r.generado)}`,
    ancho - 14,
    18,
    { align: 'right' },
  )

  const estilo = {
    styles: { font: 'helvetica', fontSize: 9, textColor: TINTA, cellPadding: 1.6 },
    headStyles: {
      fillColor: ROJO,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
    },
    alternateRowStyles: { fillColor: [245, 242, 235] as [number, number, number] },
    margin: { left: 14, right: 14 },
  }
  const montos = (desde: number, hasta: number) =>
    Object.fromEntries(
      Array.from({ length: hasta - desde + 1 }, (_, i) => [
        desde + i,
        { halign: 'right' as const },
      ]),
    )
  // Encabezados y totales alineados con su columna: montos a la derecha, la etiqueta a la izquierda.
  const alinear = (desde: number) => ({
    didParseCell: (d: {
      section: string
      column: { index: number }
      cell: { styles: { halign: string } }
    }) => {
      if (d.section === 'head' || d.section === 'foot')
        d.cell.styles.halign = d.column.index >= desde ? 'right' : 'left'
    },
  })

  autoTable(doc, {
    ...estilo,
    startY: 30,
    head: [['Cifras del mes', '']],
    body: cifrasPrincipales(r),
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(8)
  doc.setTextColor(...TINTA)
  doc.text(doc.splitTextToSize(NOTA_ESTIMACION, ancho - 28), 14, y + 5)

  autoTable(doc, {
    ...estilo,
    startY: y + 14,
    head: [['Planilla por producto', 'Kg / unid.', 'Total', 'Efectivo', 'Mercado Pago']],
    body: filasProductos(r),
    columnStyles: montos(1, 4),
    ...alinear(1),
  })

  autoTable(doc, {
    ...estilo,
    head: [['Día', 'Efectivo', 'Mercado Pago', 'Total', 'Ventas']],
    body: filasDias(r),
    columnStyles: montos(1, 4),
    ...alinear(1),
  })

  autoTable(doc, {
    ...estilo,
    head: [['Egresos por categoría', 'Cantidad', 'Total']],
    body: r.egresosCategoria.map((c) => [c.categoria, String(c.cantidad), p(c.total)]),
    ...alinear(1),
    foot: [['Total egresos', '', p(r.totalEgresos)]],
    footStyles: { fillColor: [252, 236, 234], textColor: TINTA, fontStyle: 'bold' },
    columnStyles: montos(1, 2),
  })

  autoTable(doc, {
    ...estilo,
    head: [['Fecha', 'Categoría', 'Detalle', 'Proveedor', 'Medio', 'Monto']],
    body: r.egresos.map((e) => [
      fechaLarga(e.fecha),
      e.categoria,
      e.descripcion,
      e.proveedor,
      e.medio,
      p(e.monto),
    ]),
    columnStyles: { 5: { halign: 'right' } },
    ...alinear(5),
  })

  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(110, 96, 88)
    y = doc.internal.pageSize.getHeight() - 8
    doc.text(`Granja Los Amigos · ${r.titulo} · página ${i} de ${paginas}`, ancho / 2, y, {
      align: 'center',
    })
  }

  doc.save(nombreArchivo(r, 'pdf'))
}
