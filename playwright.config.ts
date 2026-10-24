import { defineConfig, devices } from '@playwright/test'

// En la nube de Claude Code el Chromium ya viene instalado en /opt/pw-browsers/chromium.
// En tu compu, dejá PLAYWRIGHT_CHROMIUM vacío y corré una vez `npx playwright install chromium`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/preparar.ts',
  workers: 1,
  // Margen para máquinas lentas (gráficos y build en el mismo equipo).
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath },
  },
  projects: [
    // El flujo de caja cambia la base: corre una sola vez, en celular (el caso real del mostrador).
    {
      name: 'celular',
      testIgnore: /admin\.spec/,
      use: { ...devices['Pixel 5'], launchOptions: { executablePath } },
    },
    {
      name: 'escritorio',
      testIgnore: /caja\.spec/,
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    // Siempre compila de nuevo: así nunca se prueba contra un build viejo.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
