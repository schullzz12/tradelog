'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function WatchlistCard({ item, onToggleCheck, onEdit, onDelete }) {
  const router = useRouter();
  const chartRef = useRef(null);
  const candleContainerRef = useRef(null);
  const candleChartRef = useRef(null);
  const [indicators, setIndicators] = useState(null);
  const [loadingIndicators, setLoadingIndicators] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAi, setShowAi] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [chartExpanded, setChartExpanded] = useState(false);

  const checks = item.watchlist_checklist || [];
  const checkedCount = checks.filter((c) => c.checked).length;
  const totalChecks = checks.length;
  const allChecked = totalChecks > 0 && checkedCount === totalChecks;

  const derivedStatus = totalChecks === 0 ? 'watching' : allChecked ? 'ready' : 'waiting';

  const statusConfig = {
    ready: { label: 'READY', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', accent: '#22c55e' },
    waiting: { label: 'MENUNGGU', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', accent: '#f59e0b' },
    watching: { label: 'PANTAU', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', accent: '#3b82f6' },
  };
  const sc = statusConfig[derivedStatus];

  useEffect(() => {
    async function fetchData() {
      try {
        const indRes = await fetch(`/api/indicators?ticker=${item.ticker}`);
        if (indRes.ok) setIndicators(await indRes.json());

        const now = Math.floor(Date.now() / 1000);
        const yearAgo = now - 365 * 24 * 60 * 60;
        const chartRes = await fetch(`/api/chart-data?ticker=${item.ticker}.JK&period1=${yearAgo}&period2=${now}`);
        if (chartRes.ok) {
          const data = await chartRes.json();
          if (data && data.length > 0) setChartData(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoadingIndicators(false);
      }
    }
    fetchData();
  }, [item.ticker]);

  useEffect(() => {
    if (!chartData || !chartRef.current) return;
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const closes = chartData.map((d) => d.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const pad = 2;
    const isUp = closes[closes.length - 1] >= closes[0];
    const color = isUp ? '#22c55e' : '#ef4444';
    const gc = isUp ? 'rgba(34,197,94,' : 'rgba(239,68,68,';

    ctx.beginPath();
    closes.forEach((c, i) => {
      const x = (i / (closes.length - 1)) * w;
      const y = h - pad - ((c - min) / range) * (h - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, gc + '0.2)'); grad.addColorStop(1, gc + '0)');
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    closes.forEach((c, i) => {
      const x = (i / (closes.length - 1)) * w;
      const y = h - pad - ((c - min) / range) * (h - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  }, [chartData]);

  // TradingView candlestick chart when expanded
  useEffect(() => {
    if (!chartExpanded || !chartData || !candleContainerRef.current) return;

    let cancelled = false;

    async function initCandleChart() {
      const { createChart } = await import('lightweight-charts');
      if (cancelled || !candleContainerRef.current) return;

      // Remove old chart
      if (candleChartRef.current) {
        candleChartRef.current.remove();
        candleChartRef.current = null;
      }

      const container = candleContainerRef.current;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 350,
        layout: { background: { color: 'transparent' }, textColor: '#71717a', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
        grid: { vertLines: { color: 'rgba(148,163,184,0.04)' }, horzLines: { color: 'rgba(148,163,184,0.04)' } },
        rightPriceScale: { borderColor: 'rgba(148,163,184,0.1)' },
        timeScale: { borderColor: 'rgba(148,163,184,0.1)', timeVisible: false },
        crosshair: { vertLine: { color: 'rgba(148,163,184,0.2)', labelBackgroundColor: '#1e293b' }, horzLine: { color: 'rgba(148,163,184,0.2)', labelBackgroundColor: '#1e293b' } },
      });

      candleChartRef.current = chart;

      // Deduplicate
      const seen = new Set();
      const cleanData = chartData
        .filter((d) => { if (seen.has(d.time)) return false; seen.add(d.time); return true; })
        .sort((a, b) => (a.time > b.time ? 1 : -1));

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e80', wickDownColor: '#ef444480',
      });
      candleSeries.setData(cleanData);

      // Volume
      const volSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      volSeries.setData(cleanData.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      })));

      // Entry/SL/TP lines
      if (item.entry_price) {
        candleSeries.createPriceLine({ price: item.entry_price, color: '#3b82f6', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Entry' });
      }
      if (item.sl_price) {
        candleSeries.createPriceLine({ price: item.sl_price, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL' });
      }
      if (item.tp_price) {
        candleSeries.createPriceLine({ price: item.tp_price, color: '#22c55e', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP' });
      }

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (candleContainerRef.current && candleChartRef.current) {
          candleChartRef.current.applyOptions({ width: candleContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    initCandleChart();

    return () => {
      cancelled = true;
      if (candleChartRef.current) {
        candleChartRef.current.remove();
        candleChartRef.current = null;
      }
    };
  }, [chartExpanded, chartData, item.entry_price, item.sl_price, item.tp_price]);

  async function fetchAiAnalysis() {
    if (aiAnalysis) { setShowAi(!showAi); return; }
    setShowAi(true); setAiLoading(true); setAiError(null);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: item.ticker }),
      });
      if (!res.ok) throw new Error('Gagal fetch analisis');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiAnalysis(data);
    } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  }

  function handleExecuteTrade() {
    const params = new URLSearchParams({
      ticker: item.ticker, entry_price: item.entry_price || '',
      sl_price: item.sl_price || '', tp_price: item.tp_price || '', type: 'long',
    });
    router.push(`/trades/new?${params.toString()}`);
  }

  let rrRatio = null;
  if (item.entry_price && item.sl_price && item.tp_price) {
    const risk = Math.abs(item.entry_price - item.sl_price);
    const reward = Math.abs(item.tp_price - item.entry_price);
    if (risk > 0) rrRatio = (reward / risk).toFixed(2);
  }

  return (
    <div className="bg-[#16161f] border border-[#2a2a3a] rounded-r-xl overflow-hidden animate-fade-in" style={{ borderLeft: `3px solid ${sc.accent}` }}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-lg font-mono font-semibold text-white">{item.ticker}</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${sc.bg} ${sc.border} border ${sc.text}`}>{sc.label}</span>
            {item.strategy_tag && <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-400">{item.strategy_tag}</span>}
          </div>
          <div className="text-right flex items-center gap-3">
            {indicators && (
              <div>
                <span className="text-base font-mono font-semibold text-white">{formatRupiah(indicators.lastPrice)}</span>
                <span className={`text-xs ml-1.5 ${indicators.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {indicators.changePercent >= 0 ? '+' : ''}{indicators.changePercent}%
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-[#1c1c28] transition-colors" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors" title="Hapus">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chart — click to expand candlestick */}
        <div className="mb-4 rounded-lg bg-[#0f0f17] overflow-hidden cursor-pointer" onClick={() => setChartExpanded(!chartExpanded)}>
          {!chartExpanded ? (
            <div className="relative" style={{ height: 80 }}>
              {chartData ? <canvas ref={chartRef} style={{ width: '100%', height: '100%', display: 'block' }} /> : <div className="w-full h-full animate-pulse bg-white/[0.02]" />}
              <div className="absolute bottom-1.5 right-2 text-[9px] text-zinc-600">Klik untuk candlestick</div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Candlestick 1 tahun — {item.ticker}.JK</span>
                <span className="text-[10px] text-zinc-600">Klik untuk minimize</span>
              </div>
              <div ref={candleContainerRef} style={{ height: 350 }} />
            </div>
          )}
        </div>

        {(item.entry_price || item.sl_price || item.tp_price) && (
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <PlanBox label="Entry" value={item.entry_price} color="text-white" />
            <PlanBox label="Stop loss" value={item.sl_price} color="text-red-400" />
            <PlanBox label="Take profit" value={item.tp_price} color="text-emerald-400" sub={rrRatio ? `R:R 1:${rrRatio}` : null} />
          </div>
        )}

        {indicators && (
          <div className="flex flex-wrap gap-2 mb-4">
            <IndicatorPill label="RSI" value={indicators.rsi?.toFixed(1)} color={indicators.rsi > 70 ? 'red' : indicators.rsi < 30 ? 'green' : 'neutral'} hint={indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : ''} />
            <IndicatorPill label="MA Cross" value={indicators.maCross === 'bullish' ? 'Bullish' : indicators.maCross === 'bearish' ? 'Bearish' : 'Netral'} color={indicators.maCross === 'bullish' ? 'green' : indicators.maCross === 'bearish' ? 'red' : 'neutral'} />
            <IndicatorPill label="Volume" value={indicators.volumeTrend === 'high' ? 'Tinggi' : indicators.volumeTrend === 'low' ? 'Rendah' : 'Normal'} color={indicators.volumeTrend === 'high' ? 'green' : indicators.volumeTrend === 'low' ? 'red' : 'neutral'} />
            <IndicatorPill label="Support" value={formatRupiahShort(indicators.support)} color="neutral" />
            <IndicatorPill label="Resistance" value={formatRupiahShort(indicators.resistance)} color="neutral" />
          </div>
        )}
        {loadingIndicators && <div className="flex gap-2 mb-4">{[1,2,3].map(i => <div key={i} className="h-7 w-24 bg-white/[0.03] rounded-lg animate-pulse" />)}</div>}

        {checks.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Checklist</div>
            <div className="flex flex-wrap gap-1.5">
              {checks.sort((a, b) => a.sort_order - b.sort_order).map((c) => (
                <button key={c.id} onClick={() => onToggleCheck(c.id, !c.checked)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${c.checked ? 'bg-emerald-500/10 border border-emerald-500/20 text-zinc-300' : 'bg-[#1c1c28] border border-[#2a2a3a] text-zinc-500 hover:text-zinc-400'}`}>
                  <span className={c.checked ? 'text-emerald-400' : 'text-zinc-600'}>{c.checked ? '✓' : '○'}</span>
                  {c.label}
                </button>
              ))}
            </div>
            <div className={`text-[11px] mt-2 ${allChecked ? 'text-emerald-400' : checkedCount > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
              {checkedCount}/{totalChecks} terpenuhi{allChecked ? ' — siap entry!' : ''}
            </div>
          </div>
        )}

        {item.notes && (
          <div className="bg-[#0f0f17] rounded-lg px-3 py-2.5 mb-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Notes</div>
            <p className="text-xs text-zinc-400 leading-relaxed">{item.notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          {derivedStatus === 'ready' && (
            <button onClick={handleExecuteTrade} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors">
              Eksekusi trade →
            </button>
          )}
          <button onClick={fetchAiAnalysis} className={`py-2.5 px-4 rounded-lg text-sm transition-colors ${showAi ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'text-zinc-500 bg-[#1c1c28] hover:text-zinc-300'}`}>
            {aiLoading ? 'Analyzing...' : showAi ? 'Tutup AI' : 'AI Analysis'}
          </button>
        </div>

        {showAi && (
          <div className="mt-4 border-t border-[#2a2a3a] pt-4">
            {aiLoading && (
              <div className="flex items-center justify-center gap-3 py-6">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs text-zinc-500">AI menganalisis {item.ticker}...</span>
              </div>
            )}
            {aiError && (
              <div className="text-center py-4">
                <p className="text-xs text-red-400">{aiError}</p>
                <button onClick={fetchAiAnalysis} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Coba lagi</button>
              </div>
            )}
            {aiAnalysis && !aiLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${aiAnalysis.sentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' : aiAnalysis.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{aiAnalysis.sentiment}</span>
                  <span className="text-xs font-mono text-zinc-400">{aiAnalysis.sentiment_score}/10</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{aiAnalysis.summary}</p>
                {aiAnalysis.key_insight && (
                  <div className="bg-blue-500/[0.04] border border-blue-500/10 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-300 leading-relaxed">{aiAnalysis.key_insight}</p>
                  </div>
                )}
                {aiAnalysis.news && aiAnalysis.news.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Berita</div>
                    <div className="space-y-1.5">
                      {aiAnalysis.news.slice(0, 3).map((n, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${n.impact === 'Positive' ? 'bg-emerald-500' : n.impact === 'Negative' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="text-xs text-zinc-400">{n.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                    <div>
                      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Risiko</div>
                      {aiAnalysis.risks.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><span className="text-red-400 text-[10px] mt-0.5">!</span><span className="text-[11px] text-zinc-500">{r}</span></div>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.catalysts && aiAnalysis.catalysts.length > 0 && (
                    <div>
                      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Katalis</div>
                      {aiAnalysis.catalysts.slice(0, 2).map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><span className="text-emerald-400 text-[10px] mt-0.5">▲</span><span className="text-[11px] text-zinc-500">{c}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="px-5 py-3 bg-red-500/[0.04] border-t border-red-500/10 flex items-center justify-between">
          <span className="text-xs text-red-400">Hapus {item.ticker} dari watchlist?</span>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Batal</button>
            <button onClick={() => onDelete(item.id)} className="px-3 py-1.5 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Hapus</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBox({ label, value, color, sub }) {
  return (
    <div className="bg-[#0f0f17] rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-mono font-medium mt-1 ${color}`}>{value ? formatRupiah(value) : '—'}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function IndicatorPill({ label, value, color, hint }) {
  const colors = { green: 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400', red: 'bg-red-500/10 border-red-500/15 text-red-400', neutral: 'bg-white/[0.03] border-white/[0.06] text-zinc-400' };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${colors[color]}`}>
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono font-medium">{value}</span>
      {hint && <span className="text-[9px] opacity-70">({hint})</span>}
    </div>
  );
}

function formatRupiah(num) {
  if (num == null || isNaN(num)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatRupiahShort(num) {
  if (num == null || isNaN(num)) return '—';
  return new Intl.NumberFormat('id-ID').format(num);
}
