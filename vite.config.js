import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' → 产物用相对路径，方便 WebView 直接加载本地/任意域名
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { host: true, port: 5173 },
  build: { emptyOutDir: false },
})
