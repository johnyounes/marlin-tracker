'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export default function LandingPage() {
  const router = useRouter()
  useEffect(() => { router.push('/dashboard') }, [router])
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-14 h-14 border-[3px] border-accent/10 border-t-accent rounded-full animate-spin" />
    </div>
  )
}
