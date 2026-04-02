import type { Metadata, Viewport } from 'next'
import './globals.css'
// AUTH TEMPORARILY DISABLED FOR TESTING
// import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'MarlinTracker Pro — Cabo San Lucas',
  description: 'Real-time black marlin fishing intelligence. Bite Zone Score, ocean data layers, and captain-grade decision tools.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a1628',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
