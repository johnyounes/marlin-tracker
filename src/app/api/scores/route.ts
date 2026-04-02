import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { OceanDataEngine, calculateBiteScore } from '@/lib/ocean-engine'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const engine = new OceanDataEngine()
  const grid = engine.generateGrid()
  const best = grid.reduce((a, b) => (a.biteScore.total > b.biteScore.total ? a : b))

  return NextResponse.json({
    grid: grid.map((p) => ({
      lat: p.lat,
      lon: p.lon,
      score: p.biteScore.total,
      sst: p.sst,
    })),
    best: {
      lat: best.lat,
      lon: best.lon,
      score: best.biteScore,
      data: best,
    },
    moonPhase: engine.getMoonPhaseName(),
    generatedAt: new Date().toISOString(),
  })
}
