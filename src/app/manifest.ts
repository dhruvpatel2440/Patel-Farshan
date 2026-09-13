import type { MetadataRoute } from 'next'

/**
 * Served at /manifest.webmanifest, and linked automatically by Next — this is
 * what lets a customer keep Patel Farsan as an icon on their phone instead of
 * finding the site in a browser again each time.
 *
 * The icons under /public/icons are generated from public/images/logo-mark.png
 * flattened onto cream (#fdf1dc), the background that mark was drawn for.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Patel Farsan — Since 1985',
    short_name: 'Patel Farsan',
    description: 'Authentic Gujarati farsan, delivered to your door. Fresh daily since 1985.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fdf1dc',
    theme_color: '#5c1a15',
    lang: 'gu-IN',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops icons to its own shape; without a maskable variant it
      // would cut into the logo's ring.
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Menu', short_name: 'Menu', url: '/products' },
      { name: 'My Orders', short_name: 'Orders', url: '/orders' },
      { name: 'Track Order', short_name: 'Track', url: '/track' },
    ],
  }
}
