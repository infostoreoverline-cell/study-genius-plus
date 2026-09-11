import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // AVVIA.bat and the API use these fixed local ports.  Failing clearly is
    // safer than silently exposing another instance on an arbitrary port.
    strictPort: true,
  },
})
