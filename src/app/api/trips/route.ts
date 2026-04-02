import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrips, saveTrip } from '@/lib/trips'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || session.user.email || 'anon'
  const trips = await getTrips(userId)
  return NextResponse.json(trips)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id || session.user.email || 'anon'
  const body = await req.json()

  const trip = await saveTrip(userId, {
    date: body.date,
    lat: body.lat,
    lon: body.lon,
    catches: body.catches ?? 0,
    bites: body.bites ?? 0,
    weight: body.weight ?? 0,
    notes: body.notes ?? '',
    score: body.score ?? 0,
  })

  return NextResponse.json(trip, { status: 201 })
}
