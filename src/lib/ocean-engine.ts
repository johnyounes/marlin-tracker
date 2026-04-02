// ═══════════════════════════════════════════════════════════
//  MarlinTracker Pro — Ocean Data Engine
//  Generates realistic oceanographic data for Cabo San Lucas
//  Production: replace with NOAA ERDDAP / NASA PODAAC feeds
// ═══════════════════════════════════════════════════════════

export interface OceanPoint {
  lat: number
  lon: number
  sst: number
  tempBreak: number
  chlorophyll: number
  currentSpeed: number
  currentDir: number
  thermocline: number
  clarity: number
  depth: number
  moonScore: number
}

export interface BiteScoreResult {
  total: number
  components: Record<string, number>
}

export interface ScoredPoint extends OceanPoint {
  biteScore: BiteScoreResult
}

export const CONFIG = {
  center: [22.88, -109.92] as [number, number],
  zoom: 10,
  region: { latMin: 22.2, latMax: 23.8, lonMin: -110.8, lonMax: -109.2 },
  weights: {
    sst: 0.25,
    tempBreak: 0.20,
    chlorophyll: 0.15,
    current: 0.15,
    thermocline: 0.10,
    clarity: 0.08,
    moonPhase: 0.07,
  },
  optimal: {
    sst: { min: 25.5, max: 29.0, peak: 27.5 },
    chlorophyll: { min: 0.15, max: 0.55, peak: 0.30 },
    currentSpeed: { min: 0.3, max: 1.8, peak: 0.9 },
    thermocline: { min: 30, max: 80, peak: 50 },
    clarity: { min: 15, max: 35, peak: 25 },
  },
}

// ── Coordinate formatting (Degrees & Decimal Minutes) ──
export function toDDM(lat: number, lon: number): { lat: string; lon: string; full: string } {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  const absLat = Math.abs(lat)
  const absLon = Math.abs(lon)
  const latDeg = Math.floor(absLat)
  const latMin = (absLat - latDeg) * 60
  const lonDeg = Math.floor(absLon)
  const lonMin = (absLon - lonDeg) * 60
  const latStr = `${latDeg}°${latMin.toFixed(2)}'${latDir}`
  const lonStr = `${lonDeg}°${lonMin.toFixed(2)}'${lonDir}`
  return { lat: latStr, lon: lonStr, full: `${latStr}, ${lonStr}` }
}

// Named fishing areas around Cabo
export const NAMED_AREAS = [
  { name: 'Golden Gate Bank', lat: 23.05, lon: -110.15, r: 0.15 },
  { name: 'Jaime Bank', lat: 23.25, lon: -110.40, r: 0.12 },
  { name: 'San Jaime Bank', lat: 23.30, lon: -110.50, r: 0.12 },
  { name: 'Gordo Banks', lat: 23.00, lon: -109.65, r: 0.10 },
  { name: 'Inner Gordo', lat: 22.98, lon: -109.60, r: 0.08 },
  { name: '1000 Fathom Curve', lat: 22.75, lon: -110.10, r: 0.15 },
  { name: 'The Lighthouse', lat: 22.87, lon: -109.83, r: 0.06 },
  { name: 'Cabo Falso', lat: 22.84, lon: -110.02, r: 0.08 },
  { name: 'Pacific Side', lat: 22.80, lon: -110.20, r: 0.20 },
  { name: 'Finger Bank', lat: 23.10, lon: -110.25, r: 0.10 },
  { name: 'Desfondado Canyon', lat: 22.70, lon: -109.85, r: 0.12 },
  { name: 'San Jose del Cabo', lat: 23.06, lon: -109.70, r: 0.08 },
  { name: 'Chileno Bay', lat: 22.94, lon: -109.82, r: 0.05 },
  { name: 'Palmilla Point', lat: 22.97, lon: -109.76, r: 0.05 },
]

// ── Simplified Baja California coastline polygon for land masking ──
// Vertices trace the land mass clockwise: Cabo tip → Sea of Cortez coast north
// → top of bounding box → Pacific coast south → back to Cabo tip
const BAJA_LAND_POLYGON: [number, number][] = [
  // Cabo San Lucas tip
  [22.875, -109.91],
  // Sea of Cortez / east coast (going north)
  [22.91, -109.85],
  [22.95, -109.80],
  [23.00, -109.74],
  [23.06, -109.70],   // San José del Cabo
  [23.12, -109.63],
  [23.20, -109.57],
  [23.30, -109.52],
  [23.40, -109.47],
  [23.50, -109.42],
  [23.60, -109.38],
  [23.70, -109.34],
  [23.80, -109.30],   // Top of bbox, east coast
  // Top edge of bounding box (peninsula continues north)
  [23.80, -110.18],   // Top of bbox, west coast
  // Pacific coast (going south)
  [23.70, -110.14],
  [23.60, -110.13],
  [23.45, -110.22],   // Todos Santos
  [23.35, -110.20],
  [23.25, -110.16],
  [23.15, -110.12],
  [23.05, -110.05],
  [22.97, -109.98],
  [22.92, -109.95],
  [22.875, -109.91],  // Back to Cabo tip
]

// Ray-casting point-in-polygon test
function isPointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Returns true if the given coordinate is over water (not on the Baja peninsula) */
export function isWater(lat: number, lon: number): boolean {
  return !isPointInPolygon(lat, lon, BAJA_LAND_POLYGON)
}

export function getLocationName(lat: number, lon: number): string {
  let closest: (typeof NAMED_AREAS)[0] | null = null
  let minDist = Infinity
  for (const a of NAMED_AREAS) {
    const d = Math.sqrt((lat - a.lat) ** 2 + (lon - a.lon) ** 2)
    if (d < a.r && d < minDist) {
      closest = a
      minDist = d
    }
  }
  return closest ? closest.name : toDDM(lat, lon).full
}

export function gaussianScore(value: number, peak: number, sigma: number): number {
  const diff = value - peak
  return Math.max(0, Math.min(100, 100 * Math.exp(-(diff * diff) / (2 * sigma * sigma))))
}

export function calculateBiteScore(data: OceanPoint): BiteScoreResult {
  const opt = CONFIG.optimal
  const components: Record<string, number> = {
    sst: gaussianScore(data.sst, opt.sst.peak, 2.0),
    tempBreak: Math.min(100, data.tempBreak * 150),
    chlorophyll: gaussianScore(data.chlorophyll, opt.chlorophyll.peak, 0.2),
    current: gaussianScore(data.currentSpeed, opt.currentSpeed.peak, 0.5),
    thermocline: gaussianScore(data.thermocline, opt.thermocline.peak, 20),
    clarity: gaussianScore(data.clarity, opt.clarity.peak, 8),
    moonPhase: data.moonScore,
  }

  const w = CONFIG.weights
  const total =
    components.sst * w.sst +
    components.tempBreak * w.tempBreak +
    components.chlorophyll * w.chlorophyll +
    components.current * w.current +
    components.thermocline * w.thermocline +
    components.clarity * w.clarity +
    components.moonPhase * w.moonPhase

  return { total: Math.round(Math.max(0, Math.min(100, total))), components }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00e676'
  if (score >= 65) return '#00d4ff'
  if (score >= 50) return '#ffc107'
  if (score >= 35) return '#ff9100'
  return '#ff1744'
}

export function getActionLabel(score: number) {
  if (score >= 80) return { text: '🐟 STAY & FISH!', bg: 'bg-ocean-green/20', textColor: 'text-ocean-green' }
  if (score >= 65) return { text: '🎯 WORK THE AREA', bg: 'bg-accent/20', textColor: 'text-accent' }
  if (score >= 50) return { text: '👀 WATCH & WAIT', bg: 'bg-ocean-gold/20', textColor: 'text-ocean-gold' }
  if (score >= 35) return { text: '🔄 CONSIDER MOVING', bg: 'bg-ocean-orange/20', textColor: 'text-ocean-orange' }
  return { text: '⚡ MOVE NOW', bg: 'bg-ocean-red/20', textColor: 'text-ocean-red' }
}

// ── Noise functions for realistic data generation ──
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
  return n - Math.floor(n)
}

function fractalNoise(x: number, y: number, seed: number, octaves = 4): number {
  let val = 0, amp = 1, freq = 1, max = 0
  for (let i = 0; i < octaves; i++) {
    val += noise(x * freq, y * freq, seed + i * 100) * amp
    max += amp
    amp *= 0.5
    freq *= 2
  }
  return val / max
}

export class OceanDataEngine {
  dayOfYear: number
  moonPhase: number
  timeSeed: number  // changes each refresh for realistic variation

  constructor() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    this.dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)

    // Time seed: shifts every minute so refreshes produce different patterns
    // Simulates real ocean variability (eddies drifting, currents shifting)
    this.timeSeed = Math.floor(now.getTime() / 60000)

    // Moon phase (29.53-day cycle)
    const known = new Date(2024, 0, 11).getTime()
    this.moonPhase = (((Date.now() - known) / 86400000) % 29.53) / 29.53
  }

  getMoonPhaseName(): string {
    const p = this.moonPhase
    if (p < 0.0625 || p > 0.9375) return '🌑 New Moon'
    if (p < 0.1875) return '🌒 Waxing Crescent'
    if (p < 0.3125) return '🌓 First Quarter'
    if (p < 0.4375) return '🌔 Waxing Gibbous'
    if (p < 0.5625) return '🌕 Full Moon'
    if (p < 0.6875) return '🌖 Waning Gibbous'
    if (p < 0.8125) return '🌗 Last Quarter'
    return '🌘 Waning Crescent'
  }

  getMoonScore(): number {
    const d = Math.min(this.moonPhase, Math.abs(this.moonPhase - 0.5), 1 - this.moonPhase)
    return Math.max(0, 100 - d * 400)
  }

  generateSST(lat: number, lon: number): number {
    const cortez = Math.max(0, (lon + 109.5) * 2)
    const latEff = (lat - 22.5) * -0.3
    const base = 26.5 + cortez * 0.8 + latEff
    const seasonal = Math.sin((this.dayOfYear - 80) / 365 * 2 * Math.PI) * 1.5
    const eddy = (fractalNoise(lat * 5, lon * 5, 42 + this.timeSeed * 0.01) - 0.5) * 2.0
    const drift = (fractalNoise(lat * 3, lon * 3, this.timeSeed * 0.1) - 0.5) * 0.8
    const distCabo = Math.sqrt((lat - 22.88) ** 2 + (lon + 109.92) ** 2)
    const upwelling = distCabo < 0.3 ? (0.3 - distCabo) * -2.0 : 0
    return Math.max(22, Math.min(31, base + seasonal + eddy + drift + upwelling))
  }

  generateTempBreak(lat: number, lon: number): number {
    const sst = this.generateSST(lat, lon)
    const sstN = this.generateSST(lat + 0.04, lon)
    const sstE = this.generateSST(lat, lon + 0.04)
    return Math.sqrt((sst - sstN) ** 2 + (sst - sstE) ** 2)
  }

  generateChlorophyll(lat: number, lon: number): number {
    const distCoast = Math.max(0, -(lon + 109.5))
    const base = 0.5 * Math.exp(-distCoast * 2) + 0.1
    const patches = fractalNoise(lat * 8, lon * 8, 137 + this.timeSeed * 0.01) * 0.4
    const drift = (fractalNoise(lat * 6, lon * 6, this.timeSeed * 0.08) - 0.5) * 0.15
    const distCabo = Math.sqrt((lat - 22.88) ** 2 + (lon + 109.92) ** 2)
    const upwell = distCabo < 0.5 ? (0.5 - distCabo) * 0.3 : 0
    return Math.max(0.05, Math.min(2.0, base + patches + drift + upwell))
  }

  generateCurrentSpeed(lat: number, lon: number): number {
    const pacific = lon < -110.0 ? 0.8 + fractalNoise(lat * 3, lon * 3, 255 + this.timeSeed * 0.01) * 0.6 : 0
    const cortez = lon > -110.0 ? 0.4 + fractalNoise(lat * 4, lon * 4, 311 + this.timeSeed * 0.01) * 0.5 : 0
    const eddy = fractalNoise(lat * 6, lon * 6, 77 + this.timeSeed * 0.01) * 0.5
    return Math.max(0.1, pacific + cortez + eddy)
  }

  generateCurrentDir(lat: number, lon: number): number {
    const base = lon < -110.0 ? 180 : 135
    const variation = (fractalNoise(lat * 4, lon * 4, 99 + this.timeSeed * 0.01) - 0.5) * 90
    return (base + variation + 360) % 360
  }

  generateThermocline(lat: number, lon: number): number {
    const distCoast = Math.max(0, -(lon + 109.5))
    const base = 30 + distCoast * 40
    const variation = (fractalNoise(lat * 3, lon * 3, 188) - 0.5) * 25
    return Math.max(15, Math.min(120, base + variation))
  }

  generateClarity(lat: number, lon: number): number {
    const distCoast = Math.max(0, -(lon + 109.5))
    const base = 10 + distCoast * 30
    const variation = (fractalNoise(lat * 5, lon * 5, 222) - 0.5) * 10
    return Math.max(5, Math.min(40, base + variation))
  }

  generateDepth(lat: number, lon: number): number {
    const distCoast = Math.max(0.01, Math.min(2, -(lon + 109.2)))
    const base = distCoast * 800
    const canyonDist = Math.abs(lat - 22.85) + Math.abs(lon + 110.0) * 0.5
    const canyon = canyonDist < 0.3 ? (0.3 - canyonDist) * 1500 : 0
    const variation = (fractalNoise(lat * 10, lon * 10, 333) - 0.5) * 100
    return Math.max(5, base + canyon + variation)
  }

  getPointData(lat: number, lon: number): OceanPoint {
    return {
      lat, lon,
      sst: this.generateSST(lat, lon),
      tempBreak: this.generateTempBreak(lat, lon),
      chlorophyll: this.generateChlorophyll(lat, lon),
      currentSpeed: this.generateCurrentSpeed(lat, lon),
      currentDir: this.generateCurrentDir(lat, lon),
      thermocline: this.generateThermocline(lat, lon),
      clarity: this.generateClarity(lat, lon),
      depth: this.generateDepth(lat, lon),
      moonScore: this.getMoonScore(),
    }
  }

  generateGrid(resolution = 0.04): ScoredPoint[] {
    const grid: ScoredPoint[] = []
    const { latMin, latMax, lonMin, lonMax } = CONFIG.region
    for (let lat = latMin; lat <= latMax; lat += resolution) {
      for (let lon = lonMin; lon <= lonMax; lon += resolution) {
        const data = this.getPointData(lat, lon)
        grid.push({ ...data, biteScore: calculateBiteScore(data) })
      }
    }
    return grid
  }
}
