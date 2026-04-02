'use client'

import { useState, useEffect } from 'react'

interface Trip {
  id: string
  date: string
  catches: number
  bites: number
  weight: number
  notes: string
  score: number
}

interface Props {
  currentScore: number
  mapCenter: { lat: number; lng: number } | null
  onClose: () => void
}

export default function TripLog({ currentScore, mapCenter, onClose }: Props) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [catches, setCatches] = useState(0)
  const [bites, setBites] = useState(0)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/trips')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrips(data) })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          lat: mapCenter?.lat ?? 22.88,
          lon: mapCenter?.lng ?? -109.92,
          catches,
          bites,
          weight: parseInt(weight) || 0,
          notes,
          score: currentScore,
        }),
      })
      if (res.ok) {
        const trip = await res.json()
        setTrips((prev) => [trip, ...prev])
        // Reset form
        setCatches(0)
        setBites(0)
        setWeight('')
        setNotes('')
      }
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-navy-light border border-accent/15 rounded-t-2xl md:rounded-2xl max-h-[85dvh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-navy-light z-10">
          <h2 className="text-lg font-bold">📋 Trip Log</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl">✕</button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/35 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-accent focus:ring-0 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/35 mb-1.5">Catches</label>
              <input
                type="number"
                value={catches}
                onChange={(e) => setCatches(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-accent focus:ring-0 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/35 mb-1.5">Bites / Strikes</label>
              <input
                type="number"
                value={bites}
                onChange={(e) => setBites(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-accent focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/35 mb-1.5">Estimated Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 350"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-accent focus:ring-0 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/35 mb-1.5">Conditions Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Water color, bait observed, weather..."
              rows={3}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-accent focus:ring-0 focus:outline-none resize-none"
            />
          </div>

          {/* Past Trips */}
          {trips.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-[10px] uppercase tracking-wide text-white/35 mb-3">Past Trips</h4>
              <div className="space-y-2">
                {trips.slice(0, 8).map((t) => (
                  <div key={t.id} className="p-3 bg-white/[0.03] rounded-lg border border-white/5">
                    <div className="text-[10px] text-white/35">{t.date} · Score: {t.score}/100</div>
                    <div className="text-sm font-semibold mt-0.5">
                      {t.catches} catch{t.catches !== 1 ? 'es' : ''}, {t.bites} bites
                      {t.weight ? ` · ~${t.weight} lbs` : ''}
                    </div>
                    {t.notes && <div className="text-xs text-white/35 mt-1">{t.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-white/5 sticky bottom-0 bg-navy-light">
          <button onClick={onClose} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-accent text-navy rounded-lg text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
