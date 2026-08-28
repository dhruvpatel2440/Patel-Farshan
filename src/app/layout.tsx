import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display, Noto_Sans_Gujarati } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})
const gujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  variable: '--font-gujarati',
  weight: ['400', '600', '700'],
  display: 'swap',
})
const mogra = localFont({
  src: '../fonts/Mogra.ttf',
  variable: '--font-mogra',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Patel Farsan — Since 1985',
    template: '%s | Patel Farsan',
  },
  description:
    'Authentic Gujarati farsan, delivered to your door. Fresh daily since 1985.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: '#5c1a15',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${playfair.variable} ${gujarati.variable} ${mogra.variable} font-sans bg-cream antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
