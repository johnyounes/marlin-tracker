'use client'

import { useState } from 'react'

interface Props {
  activeLayers: Record<string, boolean>
  onToggle: (layer: string) => void
}

const LAYERS = [
  { id: 'heatmap', name: 'Bite Zone Heat Map', color: '#ff4444' },
  { id: 'sst', name: 'Sea Surface Temp', color: '#ff9100' },
  { id: 'chlorophyll', name: 'Chlorophyll / Bait', color: '#00e676' },
  { id: 'currents', name: 'Ocean Currents', color: '#448aff' },
  { id: 'bathymetry', name: 'Bathymetry', color: '#7c4dff' },
]

export default function LayerControls({ activeLayers, onToggle }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-[130px] left-3 z-[901] bg-navy/90 backdrop-blur-xl border border-accent/15 rounded-lg px-3 py-2 text-accent text-xs font-semibold"
      >
        ▶ Layers
      </button>
    )
  }

  return (
    <div className="fixed bottom-[130px] left-3 z-[900] bg-navy/92 backdrop-blur-xl rounded-xl border border-accent/12 shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[9px] uppercase tracking-[1.2px] text-white/35">Layers</h4>
        <button onClick={() => setCollapsed(true)} className="text-white/30 hover:text-white/60 text-sm leading-none ml-3">◀</button>
      </div>
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          onClick={() => onToggle(layer.id)}
          className={`flex items-center gap-2 w-full px-3 py-2 mb-1 rounded-lg text-xs font-medium transition-all border ${
            activeLayers[layer.id]
              ? 'bg-accent/15 text-accent border-accent/30'
              : 'bg-white/[0.03] text-white/40 border-white/[0.05] hover:bg-accent/[0.06]'
          }`}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: layer.color }} />
          {layer.name}
        </button>
      ))}
    </div>
  )
}
