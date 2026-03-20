'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// Emotion config with colors
const EMOTION_CONFIG = {
  'Confident 😎': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  'Tenang 😌': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  'FOMO 😰': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'Serakah 🤑': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  'Takut 😨': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  'Revenge 😤': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const DEFAULT_COLOR = { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };

export default function EmotionCorrelationPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .not('emotion_tag', 'is', null);

      if (!error && data) {
        setTrades(data);
      }
      setLoading(false);
    }
    fetchTrades();
  }, []);

  // Calculate emotion stats
  const emotionStats = useMemo(() => {
    const stats = {};

    trades.forEach((trade) => {
      const emotion = trade.emotion_tag;
      if (!emotion) return;

      if (!stats[emotion]) {
        stats[emotion] = {
          emotion,
          trades: [],
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
        };
      }

      const s = stats[emotion];
      s.trades.push(trade);
      s.totalTrades++;
      s.totalPnl += trade.pnl || 0;
      s.totalPnlPercent += trade.pnl_percent || 0;

      if ((trade.pnl || 0) >= 0) {
        s.wins++;
      } else {
        s.losses++;
      }
    });

    // Calculate derived metrics
    return Object.values(stats)
      .map((s) => ({
        ...s,
        winRate: s.totalTrades > 0 ? (s.wins / s.totalTrades) * 100 : 0,
        avgPnl: s.totalTrades > 0 ? s.totalPnl / s.totalTrades : 0,
        avgPnlPercent: s.totalTrades > 0 ? s.totalPnlPercent / s.totalTrades : 0,
        config: EMOTION_CONFIG[s.emotion] || DEFAULT_COLOR,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  // Overall stats
  const overallStats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter((t) => (t.pnl || 0) >= 0).length;
    return {
      totalTrades: trades.length,
      winRate: (wins / trades.length) * 100,
      avgPnlPercent: trades.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) / trades.length,
    };
  }, [trades]);

  // Best & worst emotion
  const bestEmotion = emotionStats.length > 0 ? emotionStats[0] : null;
  const worstEmotion = emotionStats.length > 0 ? emotionStats[emotionStats.length - 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Memuat data emosi...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Emotion Correlation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Analisis hubungan emosi saat entry dengan hasil trading
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-zinc-500">
            Belum ada data trade closed dengan emotion tag.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Tambah trade dengan emotion tag untuk melihat analisis.
          </p>
        </div>
      ) : (
        <>
          {/* Insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Best emotion */}
            {bestEmotion && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <p className="text-[11px] text-emerald-400/60 uppercase tracking-wider">Emosi Terbaik</p>
                <p className="text-lg font-semibold text-white mt-1">{bestEmotion.emotion}</p>
                <p className="text-sm text-emerald-400 font-mono mt-0.5">
                  Win rate {bestEmotion.winRate.toFixed(0)}% · Avg {bestEmotion.avgPnlPercent >= 0 ? '+' : ''}{bestEmotion.avgPnlPercent.toFixed(2)}%
                </p>
              </div>
            )}

            {/* Worst emotion */}
            {worstEmotion && emotionStats.length > 1 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
                <p className="text-[11px] text-red-400/60 uppercase tracking-wider">Emosi Terburuk</p>
                <p className="text-lg font-semibold text-white mt-1">{worstEmotion.emotion}</p>
                <p className="text-sm text-red-400 font-mono mt-0.5">
                  Win rate {worstEmotion.winRate.toFixed(0)}% · Avg {worstEmotion.avgPnlPercent >= 0 ? '+' : ''}{worstEmotion.avgPnlPercent.toFixed(2)}%
                </p>
              </div>
            )}

            {/* Overall baseline */}
            {overallStats && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Baseline (Semua Trade)</p>
                <p className="text-lg font-semibold text-white mt-1">{overallStats.totalTrades} trades</p>
                <p className="text-sm text-zinc-400 font-mono mt-0.5">
                  Win rate {overallStats.winRate.toFixed(0)}% · Avg {overallStats.avgPnlPercent >= 0 ? '+' : ''}{overallStats.avgPnlPercent.toFixed(2)}%
                </p>
              </div>
            )}
          </div>

          {/* Emotion breakdown table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-white">Breakdown per Emosi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Emosi</th>
                    <th className="text-center px-4 py-3 font-medium">Trades</th>
                    <th className="text-center px-4 py-3 font-medium">Win Rate</th>
                    <th className="text-center px-4 py-3 font-medium">W / L</th>
                    <th className="text-right px-4 py-3 font-medium">Avg P&L %</th>
                    <th className="text-right px-4 py-3 font-medium">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {emotionStats.map((stat) => (
                    <tr key={stat.emotion} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stat.config.color }}
                          />
                          <span className="text-white font-medium">{stat.emotion}</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3 text-zinc-400 font-mono">{stat.totalTrades}</td>
                      <td className="text-center px-4 py-3">
                        <WinRateBar winRate={stat.winRate} color={stat.config.color} />
                      </td>
                      <td className="text-center px-4 py-3 font-mono text-zinc-400">
                        <span className="text-emerald-400">{stat.wins}</span>
                        {' / '}
                        <span className="text-red-400">{stat.losses}</span>
                      </td>
                      <td className={`text-right px-4 py-3 font-mono font-medium ${
                        stat.avgPnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {stat.avgPnlPercent >= 0 ? '+' : ''}{stat.avgPnlPercent.toFixed(2)}%
                      </td>
                      <td className={`text-right px-4 py-3 font-mono font-medium ${
                        stat.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {formatRupiah(stat.totalPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual win rate comparison */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white mb-4">Win Rate per Emosi</h3>
            <div className="space-y-3">
              {emotionStats.map((stat) => (
                <div key={stat.emotion} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-zinc-400 truncate">{stat.emotion}</div>
                  <div className="flex-1 h-7 bg-white/[0.03] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(stat.winRate, 3)}%`,
                        backgroundColor: stat.config.bg,
                        borderRight: `2px solid ${stat.config.color}`,
                      }}
                    >
                      <span className="text-[11px] font-mono font-semibold" style={{ color: stat.config.color }}>
                        {stat.winRate.toFixed(0)}%
                      </span>
                    </div>
                    {/* Baseline marker */}
                    {overallStats && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-zinc-500/50"
                        style={{ left: `${overallStats.winRate}%` }}
                        title={`Baseline: ${overallStats.winRate.toFixed(0)}%`}
                      />
                    )}
                  </div>
                  <div className="w-16 text-right text-xs font-mono text-zinc-500">
                    {stat.totalTrades} trade{stat.totalTrades > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
              {/* Baseline legend */}
              {overallStats && (
                <div className="flex items-center gap-2 mt-2 pl-32">
                  <span className="w-4 h-px bg-zinc-500/50" />
                  <span className="text-[10px] text-zinc-600">
                    Baseline win rate: {overallStats.winRate.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Avg P&L comparison */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white mb-4">Avg P&L % per Emosi</h3>
            <div className="space-y-3">
              {emotionStats.map((stat) => {
                const maxAbsPnl = Math.max(...emotionStats.map((s) => Math.abs(s.avgPnlPercent)), 1);
                const barWidth = (Math.abs(stat.avgPnlPercent) / maxAbsPnl) * 50;
                const isPositive = stat.avgPnlPercent >= 0;

                return (
                  <div key={stat.emotion} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-zinc-400 truncate">{stat.emotion}</div>
                    <div className="flex-1 h-7 relative">
                      {/* Center line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700" />
                      {/* Bar */}
                      <div
                        className="absolute top-0 h-full rounded transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          borderRight: isPositive ? '2px solid #22c55e' : 'none',
                          borderLeft: !isPositive ? '2px solid #ef4444' : 'none',
                          left: isPositive ? '50%' : `${50 - barWidth}%`,
                        }}
                      />
                      {/* Label */}
                      <div
                        className="absolute top-0 h-full flex items-center text-[11px] font-mono font-semibold"
                        style={{
                          color: isPositive ? '#22c55e' : '#ef4444',
                          left: isPositive ? `${50 + barWidth + 1}%` : `${50 - barWidth - 1}%`,
                          transform: isPositive ? 'none' : 'translateX(-100%)',
                        }}
                      >
                        {isPositive ? '+' : ''}{stat.avgPnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-medium text-white mb-3">Insight</h3>
            <div className="space-y-2">
              {bestEmotion && bestEmotion.winRate > 60 && (
                <Tip
                  type="positive"
                  text={`Saat ${bestEmotion.emotion}, win rate lo ${bestEmotion.winRate.toFixed(0)}%. Pertahankan mindset ini!`}
                />
              )}
              {worstEmotion && worstEmotion.winRate < 50 && emotionStats.length > 1 && (
                <Tip
                  type="negative"
                  text={`Hati-hati saat ${worstEmotion.emotion} — win rate cuma ${worstEmotion.winRate.toFixed(0)}%. Pertimbangkan skip trading saat emosi ini.`}
                />
              )}
              {emotionStats.some((s) => s.emotion.includes('FOMO') && s.winRate < 50) && (
                <Tip
                  type="warning"
                  text="Trading saat FOMO cenderung rugi. Kalau merasa FOMO, ambil waktu sejenak sebelum entry."
                />
              )}
              {emotionStats.some((s) => s.emotion.includes('Revenge') && s.totalTrades >= 2) && (
                <Tip
                  type="warning"
                  text="Revenge trading terdeteksi. Set aturan: stop trading setelah 2 loss berturut-turut."
                />
              )}
              {trades.length < 20 && (
                <Tip
                  type="info"
                  text={`Data baru ${trades.length} trade. Minimal 20+ trades untuk insight yang lebih akurat.`}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ──

function WinRateBar({ winRate, color }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-16 h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${winRate}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-zinc-400">{winRate.toFixed(0)}%</span>
    </div>
  );
}

function Tip({ type, text }) {
  const styles = {
    positive: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.04]', icon: '✅', textColor: 'text-emerald-400/80' },
    negative: { border: 'border-red-500/20', bg: 'bg-red-500/[0.04]', icon: '⚠️', textColor: 'text-red-400/80' },
    warning: { border: 'border-amber-500/20', bg: 'bg-amber-500/[0.04]', icon: '💡', textColor: 'text-amber-400/80' },
    info: { border: 'border-blue-500/20', bg: 'bg-blue-500/[0.04]', icon: 'ℹ️', textColor: 'text-blue-400/80' },
  };
  const s = styles[type] || styles.info;

  return (
    <div className={`flex items-start gap-2 rounded-lg border ${s.border} ${s.bg} px-3 py-2.5`}>
      <span className="text-sm">{s.icon}</span>
      <p className={`text-xs ${s.textColor}`}>{text}</p>
    </div>
  );
}

// ── Helpers ──

function formatRupiah(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
