import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
})
