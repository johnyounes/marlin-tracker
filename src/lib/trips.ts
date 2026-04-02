// Simple file-based trip storage
// Production: replace with PostgreSQL/PostGIS via Prisma

import { promises as fs } from 'fs'
import path from 'path'

export interface Trip {
  id: string
  userId: string
  date: string
  lat: number
  lon: number
  catches: number
  bites: number
  weight: number
  notes: string
  score: number
  createdAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data', 'trips')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function getUserFile(userId: string) {
  // Sanitize userId for filename safety
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(DATA_DIR, `${safe}.json`)
}

export async function getTrips(userId: string): Promise<Trip[]> {
  await ensureDir()
  const file = getUserFile(userId)
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return JSON.parse(raw) as Trip[]
  } catch {
    return []
  }
}

export async function saveTrip(userId: string, trip: Omit<Trip, 'id' | 'userId' | 'createdAt'>): Promise<Trip> {
  const trips = await getTrips(userId)
  const newTrip: Trip = {
    ...trip,
    id: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    createdAt: new Date().toISOString(),
  }
  trips.unshift(newTrip)
  await fs.writeFile(getUserFile(userId), JSON.stringify(trips, null, 2))
  return newTrip
}
