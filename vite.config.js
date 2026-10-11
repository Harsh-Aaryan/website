import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HEAVY_3D = /three|CRTScene|@react-three|postprocessing/i

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !HEAVY_3D.test(dep)),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
