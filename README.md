# MarlinTracker Pro — Cabo San Lucas

Real-time black marlin fishing intelligence. Bite Zone Score, ocean data layers, and captain-grade decision tools.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your credentials
cp .env.example .env.local

# 3. Set up Google OAuth (see below)

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
7. Copy the **Client ID** and **Client Secret** into your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXTAUTH_SECRET=run-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

Generate the NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Deploy to Vercel

1. Push this project to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Add environment variables in Vercel dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` → your Vercel URL (e.g. `https://marlintracker.vercel.app`)
4. Deploy — Vercel auto-detects Next.js
5. Add your Vercel URL to Google OAuth redirect URIs

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page with Google sign-in
│   ├── dashboard/page.tsx    # Main map view (protected)
│   ├── api/
│   │   ├── auth/[...nextauth]  # Google OAuth handler
│   │   ├── scores/             # Ocean data API
│   │   └── trips/              # Trip logging API
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── MapView.tsx           # Leaflet map with all layers
│   ├── CaptainDash.tsx       # Score ring + action label
│   ├── Inspector.tsx         # Click-to-inspect panel
│   ├── LayerControls.tsx     # Toggle map layers
│   ├── TripLog.tsx           # Log & view past trips
│   └── Header.tsx            # Nav bar with user menu
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── ocean-engine.ts       # Ocean data + Bite Zone Score
│   └── trips.ts              # Trip storage
└── middleware.ts              # Route protection
```

## Bite Zone Score Algorithm

Weighted composite of 7 oceanographic variables, tuned for black marlin in the Cabo region:

| Variable | Weight | Optimal |
|----------|--------|---------|
| SST | 25% | 27.5°C |
| Temp Break | 20% | Stronger = better |
| Chlorophyll | 15% | 0.30 mg/m³ |
| Current | 15% | 0.9 knots |
| Thermocline | 10% | 50m |
| Clarity | 8% | 25m |
| Moon Phase | 7% | New/Full |
