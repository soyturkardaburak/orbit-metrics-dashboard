import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' || mode === 'production' ? '/orbit-metrics-dashboard/' : '/',
  plugins: [react(), tailwindcss()],
}))
