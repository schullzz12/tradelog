-- TradeLog Schema
-- Run this in Supabase SQL Editor if not already done

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  type VARCHAR(10) DEFAULT 'long' CHECK (type IN ('long', 'short')),
  entry_price NUMERIC(12, 2) NOT NULL,
  exit_price NUMERIC(12, 2),
  shares INTEGER NOT NULL,
  entry_date DATE NOT NULL,
  exit_date DATE,
  status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  pnl NUMERIC(14, 2),
  pnl_percent NUMERIC(8, 4),
  notes TEXT,
  setup_tag VARCHAR(50),
  emotion_tag VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON public.trades(ticker);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trades_updated_at ON public.trades;
CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
