'use client'

import { useState } from 'react'
import {
  getScoreColor,
  getActionLabel,
  gaussianScore,
  CONFIG,
  toDDM,
  type ScoredPoint,
} from '@/lib/ocean-engine'

interface Props {
  best: ScoredPoint
  grid: ScoredPoint[]
  moonPhase: string
}

export default function CaptainDash({ best, grid, moonPhase }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const score = best.biteScore.total
  const color = getScoreColor(score)
  const action = getActionLabel(score)
  const avgScore = Math.round(grid.reduce((s, p) => s + p.biteScore.total, 0) / grid.length)
  const bestCoords = toDDM(best.lat, best.lon)

  // Simulated trend
  const trendDiff = Math.round((Math.random() - 0.4) * 10)
  const trendArrow = trendDiff > 3 ? '↗' : trendDiff > 0 ? '↗' : trendDiff > -3 ? '→' : '↘'
  const trendText = trendDiff > 3 ? `Improving +${trendDiff}` : trendDiff > 0 ? `Slight uptick +${trendDiff}` : trendDiff > -3 ? 'Holding steady' : `Declining ${trendDiff}`
  const trendColor = trendDiff > 3 ? '#00e676' : trendDiff > 0 ? '#00d4ff' : trendDiff > -3 ? '#ffc107' : '#ff9100'

  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * (1 - score / 100)

  const metrics = [
    { label: 'Best SST', value: best.sst.toFixed(1), unit: '°C', pct: gaussianScore(best.sst, CONFIG.optimal.sst.peak, 2), color: '#ff9100' },
    { label: 'Bait Index', value: best.chlorophyll.toFixed(2), unit: 'mg/m³', pct: gaussianScore(best.chlorophyll, CONFIG.optimal.chlorophyll.peak, 0.2), color: '#00e676' },
    { label: 'Current', value: best.currentSpeed.toFixed(1), unit: 'kts', pct: gaussianScore(best.currentSpeed, CONFIG.optimal.currentSpeed.peak, 0.5), color: '#448aff' },
    { label: 'Thermocline', value: best.thermocline.toFixed(0), unit: 'm', pct: gaussianScore(best.thermocline, CONFIG.optimal.thermocline.peak, 20), color: '#7c4dff' },
    { label: 'Clarity', value: best.clarity.toFixed(0), unit: 'm', pct: gaussianScore(best.clarity, CONFIG.optimal.clarity.peak, 8), color: '#00bcd4' },
    { label: 'Region Avg', value: String(avgScore), unit: '/100', pct: avgScore, color: getScoreColor(avgScore) },
  ]

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed top-16 right-3 z-[901] bg-navy/90 backdrop-blur-xl border border-accent/15 rounded-lg px-3 py-2 text-accent text-xs font-semibold md:top-[68px]"
      >
        ◀ Dashboard
      </button>
    )
  }

  return (
    <div className="fixed top-16 right-3 z-[900] w-[260px] md:w-[280px] bg-navy/92 backdrop-blur-xl rounded-xl border border-accent/12 shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden md:top-[68px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-[10px] uppercase tracking-[1.5px] text-white/40">Captain&apos;s Dashboard</h2>
        <button onClick={() => setCollapsed(true)} className="text-white/30 hover:text-white/60 text-lg leading-none">◀</button>
      </div>

      {/* Score Ring + Action */}
      <div className="flex items-center gap-4 p-4">
        <div className="relative w-[90px] h-[90px] flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tighter" style={{ color }}>{score}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-[1px]">Bite Zone</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: trendColor }}>
            <span className="text-base">{trendArrow}</span>
            <span>{trendText}</span>
          </div>
          <div className={`text-sm font-bold px-3 py-1.5 rounded-lg inline-block ${action.bg} ${action.textColor}`}>
            {action.text}
          </div>
          <div className="text-[10px] text-white/30 mt-2">{moonPhase}</div>
        </div>
      </div>

      {/* Best Spot Coordinates */}
      <div className="px-4 pb-3 pt-0">
        <div className="bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
          <div className="text-[9px] uppercase tracking-[1px] text-white/35 mb-1">Best Spot</div>
          <div className="text-xs font-mono font-semibold text-accent">{bestCoords.full}</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.03]">
        {metrics.map((m) => (
          <div key={m.label} className="bg-navy/90 px-3 py-2.5">
            <div className="text-[9px] text-white/35 uppercase tracking-wide">{m.label}</div>
            <div className="text-base font-bold mt-0.5">
              {m.value} <span className="text-[10px] text-white/35 font-normal">{m.unit}</span>
            </div>
            <div className="h-[3px] rounded-full bg-white/5 mt-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${m.pct}%`, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
