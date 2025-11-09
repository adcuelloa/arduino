import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
      ],
      manifest: {
        name: 'ESP32 Web Controller',
        short_name: 'ESP32 Controller',
        description: 'Control remoto para ESP32 vía WiFi y Bluetooth',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cachear todos los assets (HTML, CSS, JS, imágenes)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Estrategia: Cache First (la app funciona completamente offline)
        runtimeCaching: [
          {
            urlPattern: /^https?.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'offlineCache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Deshabilitado en desarrollo para evitar conflictos
      },
    }),
  ],
  server: {
    port: 5172,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
