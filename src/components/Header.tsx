'use client'

import { useState, useCallback, useEffect } from 'react'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('refresh-ocean-data'))
  }, [])

  // Listen for refresh completion
  useEffect(() => {
    const handler = () => {
      setRefreshing(false)
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    window.addEventListener('ocean-data-refreshed', handler)
    return () => window.removeEventListener('ocean-data-refreshed', handler)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] h-14 bg-navy/92 backdrop-blur-xl border-b border-accent/15 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <span className="text-xl">🎣</span>
        <span className="text-base font-bold tracking-tight">
          Marlin<span className="text-accent">Tracker</span> Pro
        </span>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex gap-5 text-xs text-white/40">
        <div>Region: <span className="text-white/80 font-semibold">Cabo San Lucas</span></div>
        <div>Updated: <span className="text-white/80 font-semibold">{lastUpdated}</span></div>
      </div>

      {/* Right side: Refresh + User */}
      <div className="flex items-center gap-3">
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
            refreshing
              ? 'bg-accent/10 border-accent/20 text-accent/60 cursor-wait'
              : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20 hover:border-accent/30 active:scale-95'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>

        {/* User — auth disabled for testing */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
              T
            </div>
            <span className="hidden sm:block font-medium">Test User</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[998]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-[999] bg-navy-light border border-accent/15 rounded-lg shadow-xl overflow-hidden w-48">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-sm font-semibold">Test User</div>
                  <div className="text-[10px] text-white/35">Auth disabled for testing</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
