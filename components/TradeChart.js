'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * TradeChart — TradingView Lightweight Charts with BUY/SELL markers
 * 
 * Props:
 *   ticker    — e.g. "BBRI" (will append .JK for Yahoo Finance)
 *   entryDate — "2024-06-10"
 *   exitDate  — "2024-06-25" (null if trade is open)
 *   entryPrice — 4850
 *   exitPrice  — 5200 (null if trade is open)
 *   type       — "long" / "short"
 *   status     — "open" / "closed"
 */
export default function TradeChart({
  ticker,
  entryDate,
  exitDate,
  entryPrice,
  exitPrice,
  type = 'long',
  status = 'closed',
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        // Dynamically import lightweight-charts (client-only)
        const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts');

        if (cancelled || !chartContainerRef.current) return;

        // Clear previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        // ── Fetch OHLC data from Yahoo Finance ──
        const yahooTicker = `${ticker.toUpperCase()}.JK`;
        
        // Calculate date range: 3 months before entry to 1 month after exit (or today)
        const entryObj = new Date(entryDate);
        const rangeStart = new Date(entryObj);
        rangeStart.setMonth(rangeStart.getMonth() - 3);

        let rangeEnd;
        if (exitDate && status === 'closed') {
          rangeEnd = new Date(exitDate);
          rangeEnd.setMonth(rangeEnd.getMonth() + 1);
        } else {
          rangeEnd = new Date();
          rangeEnd.setDate(rangeEnd.getDate() + 1);
        }

        const period1 = Math.floor(rangeStart.getTime() / 1000);
        const period2 = Math.floor(rangeEnd.getTime() / 1000);

        // Yahoo Finance API via public CORS proxy
        // In production, you should route this through your own Next.js API route
        const url = `/api/chart-data?ticker=${yahooTicker}&period1=${period1}&period2=${period2}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal fetch data chart');

        const ohlcData = await res.json();

        if (cancelled || !chartContainerRef.current) return;

        if (!ohlcData || ohlcData.length === 0) {
          throw new Error(`Data chart untuk ${ticker} tidak ditemukan`);
        }

        // ── Create chart ──
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
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: 'rgba(148, 163, 184, 0.3)',
              labelBackgroundColor: '#1e293b',
            },
            horzLine: {
              color: 'rgba(148, 163, 184, 0.3)',
              labelBackgroundColor: '#1e293b',
            },
          },
          rightPriceScale: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            scaleMargins: { top: 0.1, bottom: 0.1 },
          },
          timeScale: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            timeVisible: false,
            rightOffset: 5,
            barSpacing: 8,
          },
          handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // ── Candlestick series ──
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderDownColor: '#ef4444',
          borderUpColor: '#22c55e',
          wickDownColor: '#ef4444',
          wickUpColor: '#22c55e',
        });

        // Deduplicate & sort by time (Yahoo Finance sometimes returns duplicates)
        const seen = new Set();
        const cleanData = ohlcData
          .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
          .filter((d) => {
            if (seen.has(d.time)) return false;
            seen.add(d.time);
            return true;
          });

        candleSeries.setData(cleanData);

        // ── BUY/SELL Markers ──
        const markers = [];

        // Entry marker (BUY for long, SELL for short)
        const isLong = type === 'long';
        markers.push({
          time: entryDate,
          position: 'belowBar',
          color: isLong ? '#22c55e' : '#ef4444',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: `${isLong ? 'BUY' : 'SHORT'} @ ${formatRp(entryPrice)}`,
          size: 2,
        });

        // Exit marker (only if closed)
        if (exitDate && exitPrice && status === 'closed') {
          markers.push({
            time: exitDate,
            position: 'aboveBar',
            color: isLong ? '#ef4444' : '#22c55e',
            shape: isLong ? 'arrowDown' : 'arrowUp',
            text: `${isLong ? 'SELL' : 'COVER'} @ ${formatRp(exitPrice)}`,
            size: 2,
          });
        }

        // Sort markers by time (required by lightweight-charts)
        markers.sort((a, b) => (a.time > b.time ? 1 : -1));
        candleSeries.setMarkers(markers);

        // ── Entry/Exit price lines ──
        candleSeries.createPriceLine({
          price: entryPrice,
          color: isLong ? '#22c55e' : '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: isLong ? 'Entry (BUY)' : 'Entry (SHORT)',
        });

        if (exitPrice && status === 'closed') {
          candleSeries.createPriceLine({
            price: exitPrice,
            color: isLong ? '#ef4444' : '#22c55e',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: isLong ? 'Exit (SELL)' : 'Exit (COVER)',
          });
        }

        // ── Volume series ──
        if (cleanData.some((d) => d.volume)) {
          const volumeSeries = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          });

          chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
            drawTicks: false,
          });

          volumeSeries.setData(
            cleanData
              .filter((d) => d.volume != null)
              .map((d) => ({
                time: d.time,
                value: d.volume,
                color:
                  d.close >= d.open
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
              }))
          );
        }

        // ── Fit visible range around the trade ──
        const fitStart = new Date(entryDate);
        fitStart.setDate(fitStart.getDate() - 15);
        const fitEnd = exitDate
          ? new Date(exitDate)
          : new Date();
        fitEnd.setDate(fitEnd.getDate() + 10);

        chart.timeScale().setVisibleRange({
          from: fitStart.toISOString().split('T')[0],
          to: fitEnd.toISOString().split('T')[0],
        });

        // ── Resize handler ──
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };
        window.addEventListener('resize', handleResize);

        setLoading(false);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        if (!cancelled) {
          console.error('TradeChart error:', err);
          setError(err.message || 'Gagal memuat chart');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ticker, entryDate, exitDate, entryPrice, exitPrice, type, status]);

  return (
    <div className="relative w-full rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-white tracking-wide">
              {ticker?.toUpperCase()}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                type === 'long'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {type}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {entryDate}
            {exitDate ? ` → ${exitDate}` : ' → now'}
          </span>
        </div>
        {status === 'closed' && entryPrice && exitPrice && (
          <PnLBadge
            entryPrice={entryPrice}
            exitPrice={exitPrice}
            type={type}
          />
        )}
      </div>

      {/* Chart */}
      <div className="relative" style={{ minHeight: 420 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.01] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-mono">
                Loading {ticker?.toUpperCase()}.JK...
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <svg
                className="w-8 h-8 text-red-400/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-slate-500">
                Pastikan ticker valid dan ada koneksi internet
              </p>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Legend footer */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {type === 'long' ? 'BUY' : 'COVER'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {type === 'long' ? 'SELL' : 'SHORT'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-2 border-l border-dashed border-slate-500" />
          Price levels
        </span>
      </div>
    </div>
  );
}

// ── Helper: P&L Badge ──
function PnLBadge({ entryPrice, exitPrice, type }) {
  const pnl =
    type === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pnlPercent = ((pnl / entryPrice) * 100).toFixed(2);
  const isProfit = pnl >= 0;

  return (
    <span
      className={`px-2 py-1 rounded-md text-xs font-mono font-semibold ${
        isProfit
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-red-500/10 text-red-400'
      }`}
    >
      {isProfit ? '+' : ''}
      {pnlPercent}%
    </span>
  );
}

// ── Helper: Format Rupiah (compact) ──
function formatRp(num) {
  if (num == null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
