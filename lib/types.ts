// ============================================
// TradeLog TypeScript Types
// ============================================

export type TradeDirection = 'buy' | 'sell'
export type TradeStatus = 'open' | 'closed' | 'partial'
export type Emotion = 'Confident' | 'Calm' | 'FOMO' | 'Revenge' | 'Greedy' | 'Anxious'
export type Strategy = 'Breakout' | 'Swing' | 'Support Bounce' | 'Value' | 'Momentum' | 'Scalping'
export type Mood = Emotion
export type Plan = 'free' | 'pro' | 'team'
export type WatchlistStatus = 'watching' | 'ready' | 'executed' | 'cancelled'

export interface Profile {
  id: string
  display_name: string | null
  plan: Plan
  default_shares: number
  risk_percent: number
  created_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  broker: string | null
  initial_capital: number
  is_default: boolean
  created_at: string
}

export interface Trade {
  id: string
  user_id: string
  portfolio_id: string
  ticker: string
  direction: TradeDirection
  entry_price: number
  exit_price: number | null
  shares: number
  entry_date: string
  exit_date: string | null
  buy_fee: number
  sell_fee: number
  strategy: Strategy | null
  emotion: Emotion | null
  notes: string | null
  screenshot_url: string | null
  pnl: number | null
  pnl_percent: number | null
  status: TradeStatus
  created_at: string
  updated_at: string
}

export interface Journal {
  id: string
  user_id: string
  date: string
  pre_market: string | null
  post_market: string | null
  mood: Mood | null
  created_at: string
  updated_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  ticker: string
  plan: string | null
  trigger_condition: string | null
  status: WatchlistStatus
  created_at: string
}

// ============================================
// Derived / Computed Types (for dashboard)
// ============================================

export interface TradeStats {
  total_trades: number
  wins: number
  losses: number
  open_trades: number
  win_rate: number
  total_pnl: number
  avg_win: number
  avg_loss: number
  profit_factor: number
  best_trade: Trade | null
  worst_trade: Trade | null
}

export interface DayPnL {
  date: string
  pnl: number
  trades_count: number
}

// ============================================
// Form Input Types
// ============================================

export interface TradeInput {
  ticker: string
  direction: TradeDirection
  entry_price: number
  shares: number
  entry_date: string
  portfolio_id: string
  strategy?: Strategy
  emotion?: Emotion
  notes?: string
}

export interface CloseTradeInput {
  exit_price: number
  exit_date: string
  emotion?: Emotion
  notes?: string
}
