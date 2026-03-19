import { type Trade, type TradeStats, type DayPnL } from './types'
import { clsx, type ClassValue } from 'clsx'

// ============================================
// Styling
// ============================================
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ============================================
// Formatting
// ============================================
export function formatRp(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID')
}

export function formatRpShort(value: number): string {
  const sign = value > 0 ? '+' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${sign}Rp ${(value / 1_000_000).toFixed(1)}jt`
  if (abs >= 1_000) return `${sign}Rp ${(value / 1_000).toFixed(0)}rb`
  return `${sign}Rp ${value}`
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

// ============================================
// Trade Calculations
// ============================================
export function calculatePnL(trade: Trade): number {
  if (!trade.exit_price) return 0
  return (trade.exit_price - trade.entry_price) * trade.shares - (trade.buy_fee || 0) - (trade.sell_fee || 0)
}

export function calculatePnLPercent(trade: Trade): number {
  if (!trade.exit_price) return 0
  return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
}

export function calculateStats(trades: Trade[]): TradeStats {
  const closed = trades.filter(t => t.status === 'closed')
  const open = trades.filter(t => t.status === 'open')
  const wins = closed.filter(t => (t.pnl || 0) > 0)
  const losses = closed.filter(t => (t.pnl || 0) < 0)

  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length
    : 0
  const avgLoss = losses.length > 0
    ? losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length
    : 0

  const profitFactor = avgLoss !== 0
    ? Math.abs(avgWin / avgLoss)
    : avgWin > 0 ? Infinity : 0

  const sorted = [...closed].sort((a, b) => (b.pnl || 0) - (a.pnl || 0))

  return {
    total_trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    open_trades: open.length,
    win_rate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
    total_pnl: totalPnl,
    avg_win: Math.round(avgWin),
    avg_loss: Math.round(avgLoss),
    profit_factor: Math.round(profitFactor * 100) / 100,
    best_trade: sorted[0] || null,
    worst_trade: sorted[sorted.length - 1] || null,
  }
}

// ============================================
// P&L Calendar Helper
// ============================================
export function getPnLByDay(trades: Trade[]): DayPnL[] {
  const map = new Map<string, { pnl: number; count: number }>()

  trades
    .filter(t => t.status === 'closed' && t.exit_date)
    .forEach(t => {
      const date = t.exit_date!
      const existing = map.get(date) || { pnl: 0, count: 0 }
      map.set(date, {
        pnl: existing.pnl + (t.pnl || 0),
        count: existing.count + 1,
      })
    })

  return Array.from(map.entries())
    .map(([date, data]) => ({
      date,
      pnl: data.pnl,
      trades_count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================
// Risk Calculator
// ============================================
export function calculatePositionSize(params: {
  capital: number
  riskPercent: number
  entryPrice: number
  stopLoss: number
}): { shares: number; riskAmount: number; maxLoss: number } {
  const { capital, riskPercent, entryPrice, stopLoss } = params
  const riskAmount = capital * (riskPercent / 100)
  const riskPerShare = Math.abs(entryPrice - stopLoss)

  if (riskPerShare === 0) return { shares: 0, riskAmount, maxLoss: 0 }

  const shares = Math.floor(riskAmount / riskPerShare)
  // Round to nearest 100 (1 lot IDX = 100 shares)
  const lots = Math.floor(shares / 100)
  const finalShares = lots * 100

  return {
    shares: finalShares,
    riskAmount: Math.round(riskAmount),
    maxLoss: Math.round(finalShares * riskPerShare),
  }
}

// ============================================
// Emotion colors (for badges)
// ============================================
export const EMOTION_COLORS: Record<string, { bg: string; text: string }> = {
  Confident: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Calm: { bg: 'bg-blue-50', text: 'text-blue-700' },
  FOMO: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Revenge: { bg: 'bg-red-50', text: 'text-red-700' },
  Greedy: { bg: 'bg-orange-50', text: 'text-orange-700' },
  Anxious: { bg: 'bg-purple-50', text: 'text-purple-700' },
}

// ============================================
// Constants
// ============================================
export const STRATEGIES = [
  'Breakout',
  'Swing',
  'Support Bounce',
  'Value',
  'Momentum',
  'Scalping',
] as const

export const EMOTIONS = [
  'Confident',
  'Calm',
  'FOMO',
  'Revenge',
  'Greedy',
  'Anxious',
] as const

export const BROKERS = [
  'Stockbit',
  'Ajaib',
  'Mirae Asset',
  'Indo Premier',
  'Mandiri Sekuritas',
  'Other',
] as const
