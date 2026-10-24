import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'iconos/apple-touch-icon.png'],
      manifest: {
        name: 'Granja Dani',
        short_name: 'Granja Dani',
        description: 'Planilla del día, caja y números de la granja',
        lang: 'es-AR',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f5f0',
        theme_color: '#1f5c3b',
        icons: [
          { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/iconos/icono-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // La app (HTML, JS, CSS, fuentes) queda guardada en el dispositivo: abre rápido aunque la red sea mala.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Lo de exportar (PDF/Excel) es pesado y se usa una vez por mes: se baja recién cuando hace falta.
        globIgnores: [
          '**/pdf-*.js',
          '**/excel-*.js',
          '**/html2canvas-*.js',
          '**/purify.es-*.js',
          '**/index.es-*.js',
        ],
        navigateFallback: '/index.html',
        // Los datos NUNCA se guardan en caché: una venta tiene que llegar a la base o avisar que no se guardó.
        runtimeCaching: [
          {
            urlPattern: /supabase\.co|\/rest\/v1\/|\/auth\/v1\/|\/functions\/v1\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Separa librerías grandes para que el navegador las guarde aparte y no se re-descarguen en cada cambio.
        advancedChunks: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    environment: 'node',
  },
})
