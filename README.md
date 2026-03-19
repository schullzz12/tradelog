# TradeLog — Trading Journal untuk Trader Saham Indonesia

## Quick Start (5 menit)

### 1. Prerequisites
- Node.js 18+ (download: https://nodejs.org)
- Akun Supabase gratis (https://supabase.com)
- Code editor (VS Code recommended)

### 2. Setup Project
```bash
# Clone atau copy folder ini
cd tradelog

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### 3. Setup Supabase
1. Buka https://supabase.com → Create new project
2. Nama project: `tradelog` (atau apapun)
3. Set password database (simpan baik-baik)
4. Region: Singapore (closest ke Indo)
5. Tunggu project ready (~2 menit)

### 4. Setup Database
1. Di Supabase dashboard → SQL Editor
2. Copy-paste isi file `supabase/schema.sql` → Run
3. Copy-paste isi file `supabase/rls.sql` → Run (ini yang bikin data aman)

### 5. Connect ke App
1. Di Supabase dashboard → Settings → API
2. Copy `Project URL` dan `anon public key`
3. Paste ke `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### 6. Run!
```bash
npm run dev
```
Buka http://localhost:3000 — done!

## Project Structure
```
tradelog/
├── app/                    # Next.js App Router pages
│   ├── (auth)/login/       # Halaman login/register
│   ├── (dashboard)/
│   │   ├── dashboard/      # Main dashboard + P&L calendar
│   │   └── trade/[id]/     # Chart view per trade
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page (redirect)
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── TradeEntryForm.tsx  # Smart quick-add form
│   ├── Dashboard.tsx       # Portfolio overview
│   ├── PnLCalendar.tsx     # P&L calendar hijau/merah
│   ├── StockChart.tsx      # TradingView chart + markers
│   └── TradeTable.tsx      # Trade history table
├── lib/
│   ├── supabase.ts         # Supabase client setup
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Helper functions (formatRp, dll)
├── supabase/
│   ├── schema.sql          # Database tables
│   └── rls.sql             # Row Level Security policies
├── .env.example            # Template environment variables
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Tech Stack
- **Next.js 14** — App Router, Server Components
- **Supabase** — Auth, PostgreSQL, Storage
- **TradingView Lightweight Charts** — Candlestick charts
- **Tailwind CSS** — Styling
- **TypeScript** — Type safety

## MVP Features (Phase 1)
- [x] Smart trade entry (ketik ticker, klik chart, save)
- [x] Portfolio dashboard + P&L calendar
- [x] Chart view with entry/exit markers + MFE/MAE
- [x] Basic stats (win rate, profit factor, emotion tracker)
- [x] Multi-portfolio support
- [x] Risk calculator
