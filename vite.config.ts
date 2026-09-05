import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function appVersionPlugin(): Plugin {
  return {
    name: 'app-version',
    apply: 'build',
    generateBundle(_options, bundle) {
      const names = Object.keys(bundle).sort().join('|')
      let hash = 0
      for (let i = 0; i < names.length; i++) {
        hash = (hash * 31 + names.charCodeAt(i)) | 0
      }
      const version = `${Date.now().toString(36)}-${Math.abs(hash).toString(36)}`
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), appVersionPlugin()],
  server: {
    port: 5174, // or your preferred port
    open: false, // automatically open browser
  },
})
