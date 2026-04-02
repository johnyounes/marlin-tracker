'use client'

import dynamic from 'next/dynamic'
import Header from '@/components/Header'

// Leaflet must not be server-side rendered
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function DashboardPage() {
  return (
    <main className="h-[100dvh] w-full bg-navy overflow-hidden">
      <Header />
      <MapView />
    </main>
  )
}
