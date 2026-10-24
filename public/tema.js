// Aplica el tema elegido antes de pintar, para que no parpadee. Sin preferencia: sigue al sistema.
try {
  var tema = localStorage.getItem('granja.tema')
  if (tema === 'claro' || tema === 'oscuro')
    document.documentElement.setAttribute('data-tema', tema)
} catch (e) {
  // sin almacenamiento: queda el del sistema
}
