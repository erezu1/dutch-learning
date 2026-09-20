import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages the app is served from /<repo>/, locally from /.
// The deploy workflow sets VITE_BASE.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Doei',
        short_name: 'Doei',
        description: 'A little Dutch, every day.',
        theme_color: '#faf7f2',
        background_color: '#faf7f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The word list ships with the build and is cached for offline use.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
      },
    }),
  ],
})
