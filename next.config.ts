import type { NextConfig } from 'next'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // App shell (pages, JS, CSS) — Cache First
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
    },
    // Lesson API — Network First (works offline with cached data)
    {
      urlPattern: /\/api\/lessons/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-lessons',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Stats API — Network First
    {
      urlPattern: /\/api\/stats/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-stats',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Vocabulary API — Network First
    {
      urlPattern: /\/api\/vocabulary/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-vocabulary',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // YouTube thumbnails — Cache First
    {
      urlPattern: /^https:\/\/img\.youtube\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'youtube-thumbnails',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // All other requests — Network First
    {
      urlPattern: /.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'default',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
}

export default withPWA(nextConfig)
