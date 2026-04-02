'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  OceanDataEngine,
  calculateBiteScore,
  getScoreColor,
  toDDM,
  isWater,
  CONFIG,
  type ScoredPoint,
  type OceanPoint,
  type BiteScoreResult,
} from '@/lib/ocean-engine'
import CaptainDash from './CaptainDash'
import Inspector from './Inspector'
import LayerControls from './LayerControls'
import TripLog from './TripLog'

// We need to avoid SSR for Leaflet
let L: any = null

export default function MapView() {
  const mapRef = useRef<any>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [grid, setGrid] = useState<ScoredPoint[]>([])
  const [bestZone, setBestZone] = useState<ScoredPoint | null>(null)
  const [inspecting, setInspecting] = useState<{
    point: OceanPoint
    score: BiteScoreResult
    lat: number
    lon: number
  } | null>(null)
  const [activeLayers, setActiveLayers] = useState({
    heatmap: true,
    sst: true,
    chlorophyll: false,
    currents: false,
    bathymetry: false,
    trips: false,
  })
  const [showTripLog, setShowTripLog] = useState(false)
  const [moonPhase, setMoonPhase] = useState('')
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null)
  const layersRef = useRef<Record<string, any>>({})
  const inspMarkerRef = useRef<any>(null)
  const bestMarkerRef = useRef<any>(null)
  const gpsMarkerRef = useRef<any>(null)
  const gpsWatchRef = useRef<number | null>(null)

  // Initialize Leaflet and map
  useEffect(() => {
    let cancelled = false

    async function init() {
      // Dynamic import to avoid SSR
      const leaflet = await import('leaflet')
      // @ts-ignore - CSS import handled by Next.js
      await import('leaflet/dist/leaflet.css')

      // @ts-ignore - Leaflet.heat plugin augments L
      await import('leaflet.heat')

      if (cancelled || !mapContainer.current || mapRef.current) return
      L = leaflet.default || leaflet

      const map = L.map(mapContainer.current, {
        center: CONFIG.center,
        zoom: CONFIG.zoom,
        zoomControl: false,
        attributionControl: false,
      })

      // Dark basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 16,
        opacity: 0.8,
      }).addTo(map)

      // Nautical overlay
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        maxZoom: 16,
        opacity: 0.6,
      }).addTo(map)

      // Zoom control in bottom-right on mobile
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Cabo marker
      const caboIcon = L.divIcon({
        html: '<div style="background:#00d4ff;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,212,255,0.5);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      })
      L.marker([22.8905, -109.9167], { icon: caboIcon })
        .addTo(map)
        .bindTooltip('Cabo San Lucas Marina', { direction: 'top' })

      // Click handler
      map.on('click', (e: any) => {
        const engine = new OceanDataEngine()
        const data = engine.getPointData(e.latlng.lat, e.latlng.lng)
        const score = calculateBiteScore(data)
        setInspecting({ point: data, score, lat: e.latlng.lat, lon: e.latlng.lng })

        // Drop inspect marker
        if (inspMarkerRef.current) map.removeLayer(inspMarkerRef.current)
        const icon = L.divIcon({
          html: `<div style="width:20px;height:20px;border-radius:50%;background:${getScoreColor(score.total)};border:3px solid white;box-shadow:0 0 15px ${getScoreColor(score.total)};"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: '',
        })
        inspMarkerRef.current = L.marker([e.latlng.lat, e.latlng.lng], { icon }).addTo(map)
      })

      mapRef.current = map

      // Generate ocean data
      const engine = new OceanDataEngine()
      setMoonPhase(engine.getMoonPhaseName())
      const oceanGrid = engine.generateGrid()
      setGrid(oceanGrid)

      // Find best zone
      const best = oceanGrid.reduce((a, b) => (a.biteScore.total > b.biteScore.total ? a : b))
      setBestZone(best)

      // ── Heat map: water-only, blue→cyan→yellow→red, translucent, smooth ──
      const heatData = oceanGrid
        .filter((p) => p.biteScore.total > 20 && isWater(p.lat, p.lon))
        .map((p) => [p.lat, p.lon, p.biteScore.total / 100])

      const heatLayer = (L as any).heatLayer(heatData, {
        radius: 40,
        blur: 35,
        maxZoom: 14,
        max: 1.0,
        minOpacity: 0.05,
        gradient: {
          0.0: 'rgba(0, 0, 60, 0)',       // transparent (very low)
          0.15: '#0d47a1',                 // deep blue
          0.25: '#1565c0',                 // medium blue
          0.35: '#0097a7',                 // dark cyan
          0.45: '#00bcd4',                 // cyan
          0.55: '#ffeb3b',                 // yellow
          0.65: '#ffc107',                 // amber
          0.75: '#ff9800',                 // orange
          0.85: '#f44336',                 // red
          0.95: '#d50000',                 // deep red
          1.0: '#b71c1c',                  // darkest red
        },
      }).addTo(map)

      // Apply 50% opacity for translucency over the water
      setTimeout(() => {
        if (heatLayer._canvas) {
          heatLayer._canvas.style.opacity = '0.5'
        }
      }, 100)

      layersRef.current.heatmap = heatLayer

      // SST layer
      const sstMarkers: any[] = []
      oceanGrid.forEach((p) => {
        if (Math.random() > 0.3) return
        const hue = Math.max(0, Math.min(240, (30 - p.sst) * 30))
        const rect = L.rectangle(
          [
            [p.lat - 0.03, p.lon - 0.03],
            [p.lat + 0.03, p.lon + 0.03],
          ],
          {
            color: 'transparent',
            fillColor: `hsl(${hue}, 80%, 50%)`,
            fillOpacity: 0.25,
            interactive: false,
          }
        ).addTo(map)
        sstMarkers.push(rect)
      })
      layersRef.current.sst = sstMarkers

      // Chlorophyll layer (hidden by default)
      const chlMarkers: any[] = []
      oceanGrid.forEach((p) => {
        if (Math.random() > 0.25) return
        const opacity = Math.min(0.4, p.chlorophyll * 0.5)
        const circle = L.circleMarker([p.lat, p.lon], {
          radius: 4,
          color: 'transparent',
          fillColor: `rgb(0, ${Math.min(255, Math.round(p.chlorophyll * 400))}, ${Math.min(100, Math.round(p.chlorophyll * 150))})`,
          fillOpacity: opacity,
          interactive: false,
        })
        chlMarkers.push(circle)
      })
      layersRef.current.chlorophyll = chlMarkers

      // Current arrows (hidden by default)
      const curMarkers: any[] = []
      oceanGrid.filter((_, i) => i % 12 === 0).forEach((p) => {
        const len = Math.min(0.05, p.currentSpeed * 0.03)
        const rad = (p.currentDir * Math.PI) / 180
        const endLat = p.lat + len * Math.cos(rad)
        const endLon = p.lon + len * Math.sin(rad)
        const line = L.polyline(
          [
            [p.lat, p.lon],
            [endLat, endLon],
          ],
          {
            color: `rgba(68, 138, 255, ${Math.min(0.8, p.currentSpeed * 0.5)})`,
            weight: Math.max(1, p.currentSpeed * 1.5),
            interactive: false,
          }
        )
        curMarkers.push(line)
      })
      layersRef.current.currents = curMarkers

      // Bathymetry (hidden by default)
      const bathMarkers: any[] = []
      const depthBands = [50, 100, 200, 500, 1000, 2000]
      oceanGrid.forEach((p) => {
        if (Math.random() > 0.2) return
        const band = depthBands.findIndex((d) => p.depth < d)
        const blue = 100 + (band >= 0 ? band : depthBands.length) * 25
        const opacity = 0.1 + (band >= 0 ? band : depthBands.length) * 0.04
        const circle = L.circleMarker([p.lat, p.lon], {
          radius: 3,
          color: 'transparent',
          fillColor: `rgb(40, 40, ${Math.min(255, blue)})`,
          fillOpacity: opacity,
          interactive: false,
        })
        bathMarkers.push(circle)
      })
      layersRef.current.bathymetry = bathMarkers

      // Best zone marker
      const bestIcon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${getScoreColor(best.biteScore.total)};border:3px solid white;box-shadow:0 0 20px ${getScoreColor(best.biteScore.total)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#0a1628;">★</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: '',
      })
      bestMarkerRef.current = L.marker([best.lat, best.lon], { icon: bestIcon })
        .addTo(map)
        .bindTooltip(`Best Zone: ${best.biteScore.total}/100`, { direction: 'top' })

      setReady(true)
    }

    init()
    return () => { cancelled = true }
  }, [])

  // GPS tracking
  const toggleGps = useCallback(() => {
    if (gpsActive) {
      // Stop tracking
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current)
        gpsWatchRef.current = null
      }
      if (gpsMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(gpsMarkerRef.current)
        gpsMarkerRef.current = null
      }
      setGpsActive(false)
      setGpsCoords(null)
    } else {
      // Start tracking
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser')
        return
      }
      setGpsActive(true)
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setGpsCoords({ lat: latitude, lon: longitude })

          const map = mapRef.current
          if (!map || !L) return

          // Update or create GPS marker
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng([latitude, longitude])
          } else {
            const gpsIcon = L.divIcon({
              html: `<div style="position:relative;width:20px;height:20px;">
                <div style="position:absolute;inset:0;background:rgba(0,122,255,0.15);border-radius:50%;animation:gpsPulse 2s infinite;"></div>
                <div style="position:absolute;top:4px;left:4px;width:12px;height:12px;background:#007AFF;border-radius:50%;border:2.5px solid white;box-shadow:0 0 8px rgba(0,122,255,0.6);"></div>
              </div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
              className: '',
            })
            gpsMarkerRef.current = L.marker([latitude, longitude], { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map)

            // Add pulse animation CSS
            if (!document.getElementById('gps-pulse-css')) {
              const style = document.createElement('style')
              style.id = 'gps-pulse-css'
              style.textContent = `@keyframes gpsPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }`
              document.head.appendChild(style)
            }
          }
        },
        (error) => {
          console.error('GPS error:', error)
          alert('Unable to get your location. Please check your location permissions.')
          setGpsActive(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    }
  }, [gpsActive])

  // Cleanup GPS on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current)
      }
    }
  }, [])

  // ── Refresh ocean data (regenerates grid, heat map, best zone) ──
  const refreshData = useCallback(() => {
    const map = mapRef.current
    if (!map || !L) return

    // Create fresh engine with current timestamp seed
    const engine = new OceanDataEngine()
    setMoonPhase(engine.getMoonPhaseName())
    const oceanGrid = engine.generateGrid()
    setGrid(oceanGrid)

    // New best zone
    const best = oceanGrid.reduce((a, b) => (a.biteScore.total > b.biteScore.total ? a : b))
    setBestZone(best)

    // Remove old heat layer and create new one
    if (layersRef.current.heatmap) {
      map.removeLayer(layersRef.current.heatmap)
    }
    const heatData = oceanGrid
      .filter((p) => p.biteScore.total > 20 && isWater(p.lat, p.lon))
      .map((p) => [p.lat, p.lon, p.biteScore.total / 100])

    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 40,
      blur: 35,
      maxZoom: 14,
      max: 1.0,
      minOpacity: 0.05,
      gradient: {
        0.0: 'rgba(0, 0, 60, 0)',
        0.15: '#0d47a1',
        0.25: '#1565c0',
        0.35: '#0097a7',
        0.45: '#00bcd4',
        0.55: '#ffeb3b',
        0.65: '#ffc107',
        0.75: '#ff9800',
        0.85: '#f44336',
        0.95: '#d50000',
        1.0: '#b71c1c',
      },
    }).addTo(map)

    setTimeout(() => {
      if (heatLayer._canvas) {
        heatLayer._canvas.style.opacity = '0.5'
      }
    }, 100)

    layersRef.current.heatmap = heatLayer

    // Update best zone marker
    if (bestMarkerRef.current) map.removeLayer(bestMarkerRef.current)
    const bestIcon = L.divIcon({
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${getScoreColor(best.biteScore.total)};border:3px solid white;box-shadow:0 0 20px ${getScoreColor(best.biteScore.total)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#0a1628;">★</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: '',
    })
    bestMarkerRef.current = L.marker([best.lat, best.lon], { icon: bestIcon })
      .addTo(map)
      .bindTooltip(`Best Zone: ${best.biteScore.total}/100`, { direction: 'top' })

    // Clear any active inspection since data changed
    setInspecting(null)
    if (inspMarkerRef.current) {
      map.removeLayer(inspMarkerRef.current)
      inspMarkerRef.current = null
    }

    // Dispatch event to let Header know refresh finished
    window.dispatchEvent(new CustomEvent('ocean-data-refreshed'))
  }, [])

  // Listen for refresh requests from the Header
  useEffect(() => {
    const handler = () => refreshData()
    window.addEventListener('refresh-ocean-data', handler)
    return () => window.removeEventListener('refresh-ocean-data', handler)
  }, [refreshData])

  // Toggle layers
  const handleToggleLayer = useCallback(
    (layer: string) => {
      const map = mapRef.current
      if (!map || !L) return

      setActiveLayers((prev) => {
        const next = { ...prev, [layer]: !prev[layer as keyof typeof prev] }
        const items = layersRef.current[layer]
        if (!items) return next

        if (next[layer as keyof typeof next]) {
          if (Array.isArray(items)) items.forEach((m: any) => m.addTo(map))
          else items.addTo(map)
        } else {
          if (Array.isArray(items)) items.forEach((m: any) => map.removeLayer(m))
          else map.removeLayer(items)
        }
        return next
      })
    },
    []
  )

  const gpsDisplay = gpsCoords ? toDDM(gpsCoords.lat, gpsCoords.lon) : null

  return (
    <div className="relative w-full h-[100dvh] bg-navy">
      {/* Loading state */}
      {!ready && (
        <div className="absolute inset-0 z-[3000] flex flex-col items-center justify-center bg-navy">
          <div className="w-14 h-14 border-[3px] border-accent/10 border-t-accent rounded-full animate-spin" />
          <p className="mt-5 text-xs tracking-[3px] uppercase text-white/40">Fetching Ocean Data...</p>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Captain's Dashboard */}
      {ready && bestZone && (
        <CaptainDash best={bestZone} grid={grid} moonPhase={moonPhase} />
      )}

      {/* Inspector Panel */}
      {inspecting && (
        <Inspector
          point={inspecting.point}
          score={inspecting.score}
          lat={inspecting.lat}
          lon={inspecting.lon}
          onClose={() => {
            setInspecting(null)
            if (inspMarkerRef.current && mapRef.current) {
              mapRef.current.removeLayer(inspMarkerRef.current)
            }
          }}
        />
      )}

      {/* Layer Controls */}
      {ready && (
        <LayerControls activeLayers={activeLayers} onToggle={handleToggleLayer} />
      )}

      {/* GPS Toggle Button */}
      {ready && (
        <button
          onClick={toggleGps}
          className={`fixed bottom-5 left-3 z-[900] flex items-center gap-2 font-bold text-sm px-4 py-3 rounded-full shadow-lg transition-all ${
            gpsActive
              ? 'bg-[#007AFF] text-white shadow-[0_4px_20px_rgba(0,122,255,0.4)]'
              : 'bg-navy/90 backdrop-blur-xl border border-accent/15 text-white/60 hover:text-white/90'
          } md:bottom-5`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          <span className="text-xs">{gpsActive ? 'GPS On' : 'My Location'}</span>
        </button>
      )}

      {/* GPS Coordinates Display */}
      {gpsActive && gpsDisplay && (
        <div className="fixed bottom-[70px] left-3 z-[900] bg-navy/90 backdrop-blur-xl rounded-lg border border-[#007AFF]/30 px-3 py-2 md:bottom-[70px]">
          <div className="text-[9px] uppercase tracking-[1px] text-[#007AFF]/70 mb-0.5">Your Position</div>
          <div className="text-[11px] font-mono font-semibold text-[#007AFF]">{gpsDisplay.full}</div>
        </div>
      )}

      {/* Trip Log Button */}
      {ready && (
        <button
          onClick={() => setShowTripLog(true)}
          className="fixed bottom-24 right-3 z-[900] flex items-center gap-2 bg-accent text-navy font-bold text-sm px-5 py-3 rounded-full shadow-[0_4px_20px_rgba(0,212,255,0.4)] hover:scale-105 active:scale-95 transition-transform"
        >
          📋 Log Trip
        </button>
      )}

      {/* Trip Log Modal */}
      {showTripLog && (
        <TripLog
          currentScore={bestZone?.biteScore.total ?? 0}
          mapCenter={mapRef.current?.getCenter()}
          onClose={() => setShowTripLog(false)}
        />
      )}
    </div>
  )
}
