import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import express from 'express';
import { apiRouter } from './server/api.ts';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'SYSJEGER V2.0 — GMIT BETEL FUIMELANG',
          short_name: 'SYSJEGER',
          description: 'Sistem Informasi Manajemen Jemaat dan Gereja GMIT BETEL FUIMELANG, Desa Lembur Tengah, Klasis Alor Tengah Utara.',
          theme_color: '#09051c',
          background_color: '#09051c',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,woff,woff2}'],
          runtimeCaching: [
            {
              // Only public, aggregate/content endpoints are cacheable. Never
              // cache private member, finance, document, or audit responses.
              urlPattern: /\/api\/(stats|events|schedules|announcements|rayons|categorials)$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'gmit-public-api',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          const app = express();
          app.use(express.json({ limit: '10mb' }));
          app.use(express.urlencoded({ extended: true }));
          app.use('/api', apiRouter);
          server.middlewares.use(app);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // Arena's browser preview uses a generated e2b.app hostname.
      allowedHosts: true,
      // HMR is disabled in AI Studio preview iframe environment to prevent WebSocket errors
      hmr: false,
      watch: null,
    },
  };
});
