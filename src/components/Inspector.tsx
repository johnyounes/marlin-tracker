'use client'

import { getScoreColor, getLocationName, toDDM, type OceanPoint, type BiteScoreResult } from '@/lib/ocean-engine'
import { OceanDataEngine } from '@/lib/ocean-engine'

interface Props {
  point: OceanPoint
  score: BiteScoreResult
  lat: number
  lon: number
  onClose: () => void
}

const engine = new OceanDataEngine()

export default function Inspector({ point, score, lat, lon, onClose }: Props) {
  const totalColor = getScoreColor(score.total)
  const locationName = getLocationName(lat, lon)
  const coords = toDDM(lat, lon)

  const rows = [
    { icon: '🌡️', name: 'Sea Surface Temp', value: `${point.sst.toFixed(1)}°C / ${(point.sst * 9 / 5 + 32).toFixed(1)}°F`, score: score.components.sst, color: '#ff9100' },
    { icon: '📊', name: 'Temp Break', value: `${point.tempBreak.toFixed(2)}°C/4km`, score: score.components.tempBreak, color: '#ff4444' },
    { icon: '🌿', name: 'Chlorophyll (Bait)', value: `${point.chlorophyll.toFixed(2)} mg/mó`, score: score.components.chlorophyll, color: '#00e676' },
    { icon: '🌊', name: 'Current', value: `${point.currentSpeed.toFixed(1)} kts`, score: score.components.current, color: '#448aff' },
    { icon: '📏', name: 'Thermocline', value: `${point.thermocline.toFixed(0)}m / ${(point.thermocline * 3.28).toFixed(0)}ft`, score: score.components.thermocline, color: '#7c4dff' },
    { icon: '👁️', name: 'Water Clarity', value: `${point.clarity.toFixed(0)}m Secchi`, score: score.components.clarity, color: '#00bcd4' },
    { icon: '🌙', name: 'Moon Phase', value: engine.getMoonPhaseName().split(' ').slice(1).join(' '), score: score.components.moonPhase, color: '#ffc107' },
    { icon: '⚗', name: 'Depth', value: `${point.depth.toFixed(0)}m / ${(point.depth * 0.547).toFixed(0)} fathoms`, score: null, color: '#90a4ae' },
  ]

  return (
    <div className="fixed top-16 left-3 z-[900] w-[280px] md:w-[300px] bg-navy/92 backdrop-blur-xl rounded-xl border border-accent/12 shadow-[0_4px_24px_rgba(0,0,0,0.5)] max-h-[calc(100dvh-120px)] overflow-y-auto md:top-[68px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-navy/95 backdrop-blur-xl z-10">
        <h3 className="text-sm font-semibold truncate pr-2">{locationName}</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none flex-shrink-0">✕</button>
      </div>

      {/* Score */}
      <div className="text-center py-4 border-b border-white/5">
        <div className="text-5xl font-extrabold tracking-tighter" style={{ color: totalColor }}>{score.total}</div>
        <div className="text-[11px] text-white/50 mt-1 font-mono">{coords.full}</div>
      </div>

      {/* Breakdown */}
      <div className="px-4 py-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: `${r.color}15` }}
              >
                {r.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-white/35">{r.name}</div>
                <div className="text-xs font-semibold truncate">{r.value}</div>
              </div>
            </div>
            {r.score !== null && (
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs font-bold" style={{ color: getScoreColor(r.score) }}>{Math.round(r.score)}</div>
                <div className="w-12 h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.color }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
