'use client';

import { useState, useEffect, useRef } from 'react';
import AIAnalysis from '@/components/AIAnalysis';

const IDX_TICKERS = [
  // Big banks
  'BBRI','BBCA','BMRI','BBNI','BRIS','BTPS','BJTM','BJBR','MEGA','PNBN','NISP','ARTO','BBYB','AMAR','BBTN','BNGA','BDMN',
  // Telco & tech
  'TLKM','EXCL','ISAT','TOWR','MNCN','SCMA','EMTK','BUKA','GOTO','BELI',
  // Consumer
  'UNVR','HMSP','GGRM','KLBF','ICBP','INDF','MYOR','ROTI','ULTJ','GOOD','ADES','AMRT','CPIN','JPFA','SIDO','TSPC','PYFA','KAEF','INAF',
  // Mining & energy
  'ADRO','PTBA','ITMG','ANTM','INCO','MDKA','MEDC','ELSA','RAJA','ESSA','DSSA',
  'NCKL','MBMA','BREN','CUAN','HRUM','TINS','UNTR','HEXA',
  // Property
  'ASRI','BSDE','CTRA','SMRA','PWON','DILD','LPKR','PPRO','JRPT','MKPI','BKSL',
  // Infrastructure & construction
  'WIKA','PTPP','WSKT','ADHI','JSMR','WTON','INTP','SMGR',
  // Plantation
  'LSIP','AALI','DSNG','TBLA','SGRO',
  // Retail & distribution
  'ACES','ERAA','MPMX',
  // Pulp & paper
  'INKP','TKIM',
  // Petrochem & industrial
  'TPIA','BRPT','SRTG',
  // Gas & fuel
  'PGAS','AKRA',
  // Others popular
  'FILM','MAPI','LPPF','BTBR','PGEO','AMMN','CBDK','JARR','DCII','EMPT',
];

const PERIODS = [
  { label: 'YTD', value: 'ytd' },
  { label: '6 Bulan', value: '6m' },
  { label: '1 Tahun', value: '1y' },
  { label: '2 Tahun', value: '2y' },
];

export default function PerformancePage() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const [ticker, setTicker] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [period, setPeriod] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const filteredTickers = searchQuery.length > 0
    ? IDX_TICKERS.filter((t) => t.startsWith(searchQuery.toUpperCase())).slice(0, 8)
    : [];

  useEffect(() => {
    if (!ticker) return;
    loadComparison();
  }, [ticker, period]);

  async function loadComparison() {
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const { createChart, LineStyle } = await import('lightweight-charts');

      const now = new Date();
      let start = new Date();

      if (period === 'ytd') {
        start = new Date(now.getFullYear(), 0, 1);
      } else if (period === '6m') {
        start.setMonth(start.getMonth() - 6);
      } else if (period === '1y') {
        start.setFullYear(start.getFullYear() - 1);
      } else if (period === '2y') {
        start.setFullYear(start.getFullYear() - 2);
      }

      const period1 = Math.floor(start.getTime() / 1000);
      const period2 = Math.floor(now.getTime() / 1000);

      const [stockRes, ihsgRes] = await Promise.all([
        fetch(`/api/chart-data?ticker=${ticker.toUpperCase()}.JK&period1=${period1}&period2=${period2}`),
        fetch(`/api/chart-data?ticker=%5EJKSE&period1=${period1}&period2=${period2}`),
      ]);

      if (!stockRes.ok) throw new Error(`Gagal fetch data ${ticker}`);
      if (!ihsgRes.ok) throw new Error('Gagal fetch data IHSG');

      const stockData = await stockRes.json();
      const ihsgData = await ihsgRes.json();

      if (!stockData?.length) throw new Error(`Data ${ticker} tidak ditemukan`);
      if (!ihsgData?.length) throw new Error('Data IHSG tidak ditemukan');

      const dedup = (data) => {
        const seen = new Set();
        return data
          .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
          .filter((d) => {
            if (seen.has(d.time)) return false;
            seen.add(d.time);
            return true;
          });
      };

      const cleanStock = dedup(stockData);
      const cleanIhsg = dedup(ihsgData);

      const baseStock = cleanStock[0].close;
      const baseIhsg = cleanIhsg[0].close;

      const normalizedStock = cleanStock.map((d) => ({
        time: d.time,
        value: ((d.close - baseStock) / baseStock) * 100,
      }));

      const normalizedIhsg = cleanIhsg.map((d) => ({
        time: d.time,
        value: ((d.close - baseIhsg) / baseIhsg) * 100,
      }));

      const lastStock = cleanStock[cleanStock.length - 1].close;
      const lastIhsg = cleanIhsg[cleanIhsg.length - 1].close;
      const stockReturn = ((lastStock - baseStock) / baseStock) * 100;
      const ihsgReturn = ((lastIhsg - baseIhsg) / baseIhsg) * 100;
      const alpha = stockReturn - ihsgReturn;

      const stockHigh = Math.max(...cleanStock.map((d) => d.close));
      const stockLow = Math.min(...cleanStock.map((d) => d.close));
      const stockHighPct = ((stockHigh - baseStock) / baseStock) * 100;
      const stockLowPct = ((stockLow - baseStock) / baseStock) * 100;

      setStats({
        stockReturn,
        ihsgReturn,
        alpha,
        baseStock,
        lastStock,
        baseIhsg,
        lastIhsg,
        stockHigh,
        stockLow,
        stockHighPct,
        stockLowPct,
        outperform: alpha > 0,
      });

      // ── Create chart ──
      if (!chartContainerRef.current) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const container = chartContainerRef.current;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 420,
        layout: {
          background: { color: 'transparent' },
          textColor: '#94a3b8',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
          horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(148, 163, 184, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(148, 163, 184, 0.1)',
          timeVisible: false,
          rightOffset: 5,
        },
        crosshair: {
          vertLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: '#1e293b' },
          horzLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: '#1e293b' },
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      // Stock line with area gradient
      const stockSeries = chart.addAreaSeries({
        lineColor: '#22c55e',
        lineWidth: 2,
        topColor: 'rgba(34, 197, 94, 0.25)',
        bottomColor: 'rgba(34, 197, 94, 0.0)',
        title: ticker.toUpperCase(),
        priceFormat: {
          type: 'custom',
          formatter: (val) => val.toFixed(2) + '%',
        },
      });
      stockSeries.setData(normalizedStock);

      // IHSG line (no area fill, just line)
      const ihsgSeries = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        title: 'IHSG',
        priceFormat: {
          type: 'custom',
          formatter: (val) => val.toFixed(2) + '%',
        },
      });
      ihsgSeries.setData(normalizedIhsg);

      // Zero line
      const zeroLine = chart.addLineSeries({
        color: 'rgba(148, 163, 184, 0.2)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const zeroData = normalizedStock.map((d) => ({ time: d.time, value: 0 }));
      zeroLine.setData(zeroData);

      // Resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      setLoading(false);
      return () => window.removeEventListener('resize', handleResize);
    } catch (err) {
      console.error('Performance chart error:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Performa Saham vs IHSG</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Bandingkan return saham dengan IHSG (benchmark)
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Ticker search */}
        <div className="relative w-64">
          <label className="block text-xs text-zinc-500 mb-1.5">Saham</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value.toUpperCase());
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                const val = searchQuery.trim().toUpperCase();
                setTicker(val);
                setSearchQuery(val);
                setShowDropdown(false);
              }
            }}
            placeholder="Ketik ticker lalu Enter..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono uppercase"
          />
          {showDropdown && filteredTickers.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/[0.08] rounded-lg overflow-hidden shadow-xl">
              {filteredTickers.map((t) => (
                <button
                  key={t}
                  onMouseDown={() => {
                    setTicker(t);
                    setSearchQuery(t);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-mono text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                >
                  {t}<span className="text-zinc-600">.JK</span>
                </button>
              ))}
              {/* Show hint if query doesn't match any suggestion */}
              {searchQuery.length >= 2 && !IDX_TICKERS.includes(searchQuery.toUpperCase()) && (
                <button
                  onMouseDown={() => {
                    const val = searchQuery.trim().toUpperCase();
                    setTicker(val);
                    setSearchQuery(val);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-mono text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors border-t border-white/[0.04]"
                >
                  Cari "<span className="text-white">{searchQuery.toUpperCase()}</span>" di Yahoo Finance
                </button>
              )}
            </div>
          )}
          {/* Show "press Enter" hint when typing unknown ticker */}
          {showDropdown && searchQuery.length >= 2 && filteredTickers.length === 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/[0.08] rounded-lg overflow-hidden shadow-xl">
              <button
                onMouseDown={() => {
                  const val = searchQuery.trim().toUpperCase();
                  setTicker(val);
                  setSearchQuery(val);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm font-mono text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
              >
                Cari "<span className="text-white">{searchQuery.toUpperCase()}</span>.JK" — tekan Enter
              </button>
            </div>
          )}
        </div>

        {/* Period selector */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Periode</label>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats cards — redesigned with tinted backgrounds */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={`${ticker.toUpperCase()} Return`}
            value={`${stats.stockReturn >= 0 ? '+' : ''}${stats.stockReturn.toFixed(2)}%`}
            sub={`${formatRupiah(stats.baseStock)} → ${formatRupiah(stats.lastStock)}`}
            color={stats.stockReturn >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="IHSG Return"
            value={`${stats.ihsgReturn >= 0 ? '+' : ''}${stats.ihsgReturn.toFixed(2)}%`}
            sub={`${formatNumber(stats.baseIhsg)} → ${formatNumber(stats.lastIhsg)}`}
            color={stats.ihsgReturn >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Alpha (Selisih)"
            value={`${stats.alpha >= 0 ? '+' : ''}${stats.alpha.toFixed(2)}%`}
            badge={stats.outperform ? 'OUTPERFORM' : 'UNDERPERFORM'}
            color={stats.alpha >= 0 ? 'green' : 'red'}
          />
          <RangeCard
            label="Range Harga"
            low={stats.stockLow}
            high={stats.stockHigh}
            current={stats.lastStock}
            lowPct={stats.stockLowPct}
            highPct={stats.stockHighPct}
          />
        </div>
      )}

      {/* Chart */}
      {ticker && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {/* Chart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-emerald-500 rounded" />
                <span className="text-xs text-zinc-400">{ticker.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-amber-500 rounded" />
                <span className="text-xs text-zinc-400">IHSG</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 border-t border-dashed border-zinc-600" />
                <span className="text-xs text-zinc-600">0% baseline</span>
              </div>
            </div>
            {stats && (
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
                stats.outperform
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
              }`}>
                {stats.outperform ? '↑ OUTPERFORM' : '↓ UNDERPERFORM'}
              </span>
            )}
          </div>

          <div className="relative" style={{ minHeight: 420 }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 font-mono">
                    Loading {ticker}.JK vs IHSG...
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center px-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}
            <div ref={chartContainerRef} className="w-full" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ticker && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
          <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-sm text-zinc-500">Pilih saham untuk melihat performa vs IHSG</p>
        </div>
      )}

      {/* AI Analysis */}
      {ticker && !loading && (
        <AIAnalysis ticker={ticker} />
      )}
    </div>
  );
}

// ── Redesigned stat card with tinted background ──
function StatCard({ label, value, sub, color, badge }) {
  const tints = {
    green: {
      bg: 'bg-gradient-to-br from-emerald-500/[0.08] to-emerald-900/[0.03]',
      border: 'border-emerald-500/15',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-500/[0.08] to-red-900/[0.03]',
      border: 'border-red-500/15',
      text: 'text-red-400',
      badgeBg: 'bg-red-500/15',
      badgeText: 'text-red-400',
    },
    neutral: {
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.06]',
      text: 'text-white',
      badgeBg: 'bg-white/[0.06]',
      badgeText: 'text-zinc-300',
    },
  };
  const t = tints[color] || tints.neutral;

  return (
    <div className={`rounded-xl p-4 border ${t.border} ${t.bg}`}>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-mono font-bold mt-1.5 ${t.text}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
      {badge && (
        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${t.badgeBg} ${t.badgeText}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Range card with visual progress bar ──
function RangeCard({ label, low, high, current, lowPct, highPct }) {
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.02]">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono font-bold mt-1.5 text-white">
        {formatRupiah(low)} – {formatRupiah(high)}
      </p>
      {/* Visual range bar */}
      <div className="mt-2.5 relative">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-visible relative">
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, position))}%`,
              background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)',
            }}
          />
          {/* Current price dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[#0f1117] shadow-sm"
            style={{ left: `${Math.min(96, Math.max(2, position))}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-zinc-600">Low {lowPct.toFixed(1)}%</span>
          <span className="text-[10px] text-zinc-600">High +{highPct.toFixed(1)}%</span>
        </div>
      </div>
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

function formatNumber(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
