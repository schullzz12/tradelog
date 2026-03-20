'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Popular IDX tickers for autocomplete
const IDX_TICKERS = [
  'BBRI','BBCA','BMRI','BBNI','TLKM','ASII','UNVR','HMSP','GGRM','KLBF',
  'ICBP','INDF','SMGR','PTBA','ADRO','ITMG','ANTM','INCO','MDKA','AMRT',
  'CPIN','JPFA','EXCL','ISAT','TOWR','MNCN','SCMA','EMTK','ACES','ERAA',
  'BRIS','BTPS','BJTM','BJBR','MEGA','PNBN','NISP','ARTO','BBYB','AMAR',
  'ASRI','BSDE','CTRA','SMRA','PWON','DILD','LPKR','PPRO','JRPT','MKPI',
  'UNTR','HEXA','PGAS','AKRA','MPMX','LSIP','AALI','DSNG','TBLA','SGRO',
  'SIDO','TSPC','PYFA','KAEF','INAF','MYOR','ROTI','ULTJ','GOOD','ADES',
  'INKP','TKIM','INTP','WTON','WIKA','PTPP','WSKT','ADHI','JSMR','BKSL',
  'TPIA','BRPT','ESSA','MEDC','ELSA','RAJA','SRTG','DSSA','BUKA','GOTO',
];

export default function QuickAddTradePage() {
  const router = useRouter();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

  // Chart state
  const [ticker, setTicker] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [chartReady, setChartReady] = useState(false);

  // Form state
  const [type, setType] = useState('long');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [lots, setLots] = useState('');
  const [status, setStatus] = useState('closed');
  const [setupTag, setSetupTag] = useState('');
  const [emotionTag, setEmotionTag] = useState('');
  const [notes, setNotes] = useState('');
  const [clickMode, setClickMode] = useState('entry'); // 'entry' | 'exit'
  const [saving, setSaving] = useState(false);

  // Filtered tickers for autocomplete
  const filteredTickers = searchQuery.length > 0
    ? IDX_TICKERS.filter((t) => t.startsWith(searchQuery.toUpperCase())).slice(0, 8)
    : [];

  // Load chart when ticker is selected
  useEffect(() => {
    if (!ticker) return;
    loadChart(ticker);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
  }, [ticker]);

  // Update markers when entry/exit change
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    updateMarkers();
  }, [entryPrice, exitPrice, entryDate, exitDate, type]);

  async function loadChart(tickerSymbol) {
    setChartLoading(true);
    setChartError(null);
    setChartReady(false);

    try {
      const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts');

      if (!chartContainerRef.current) return;

      // Clear previous
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }

      // Fetch 6 months of data
      const yahooTicker = `${tickerSymbol.toUpperCase()}.JK`;
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const period1 = Math.floor(sixMonthsAgo.getTime() / 1000);
      const period2 = Math.floor(now.getTime() / 1000);

      const res = await fetch(`/api/chart-data?ticker=${yahooTicker}&period1=${period1}&period2=${period2}`);
      if (!res.ok) throw new Error('Gagal fetch data chart');

      const ohlcData = await res.json();
      if (!ohlcData || ohlcData.length === 0) throw new Error(`Data ${tickerSymbol} tidak ditemukan`);

      // Deduplicate & sort
      const seen = new Set();
      const cleanData = ohlcData
        .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
        .filter((d) => {
          if (seen.has(d.time)) return false;
          seen.add(d.time);
          return true;
        });

      // Create chart
      const container = chartContainerRef.current;
      const chart = createChart(container, {
        width: container.clientWidth,
        height: 460,
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
          vertLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: '#1e293b' },
          horzLine: { color: 'rgba(148, 163, 184, 0.3)', labelBackgroundColor: '#1e293b' },
        },
        rightPriceScale: {
          borderColor: 'rgba(148, 163, 184, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.15 },
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

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      });

      candleSeries.setData(cleanData);
      candleSeriesRef.current = candleSeries;

      // Volume
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
              color: d.close >= d.open ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            }))
        );
      }

      // Click handler — set entry/exit price from chart
      chart.subscribeClick((param) => {
        if (!param.point || !param.time) return;

        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price == null || price <= 0) return;

        const roundedPrice = Math.round(price);
        const dateStr = param.time; // YYYY-MM-DD string

        // Use current clickMode from ref to avoid stale closure
        setClickMode((currentMode) => {
          if (currentMode === 'entry') {
            setEntryPrice(String(roundedPrice));
            setEntryDate(dateStr);
            return 'exit'; // auto switch to exit mode
          } else {
            setExitPrice(String(roundedPrice));
            setExitDate(dateStr);
            return 'entry'; // reset back
          }
        });
      });

      // Resize handler
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      setChartReady(true);
      setChartLoading(false);

      return () => window.removeEventListener('resize', handleResize);
    } catch (err) {
      console.error('Chart error:', err);
      setChartError(err.message);
      setChartLoading(false);
    }
  }

  function updateMarkers() {
    if (!candleSeriesRef.current) return;

    const markers = [];
    const isLong = type === 'long';

    if (entryPrice && entryDate) {
      markers.push({
        time: entryDate,
        position: 'belowBar',
        color: isLong ? '#22c55e' : '#ef4444',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: `${isLong ? 'BUY' : 'SHORT'} @ ${formatRp(Number(entryPrice))}`,
        size: 2,
      });
    }

    if (exitPrice && exitDate) {
      markers.push({
        time: exitDate,
        position: 'aboveBar',
        color: isLong ? '#ef4444' : '#22c55e',
        shape: isLong ? 'arrowDown' : 'arrowUp',
        text: `${isLong ? 'SELL' : 'COVER'} @ ${formatRp(Number(exitPrice))}`,
        size: 2,
      });
    }

    markers.sort((a, b) => (a.time > b.time ? 1 : -1));
    candleSeriesRef.current.setMarkers(markers);
  }

  async function handleSave() {
    if (!ticker || !entryPrice || !lots || !entryDate) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const shares = parseInt(lots) * 100;
      const entry = parseFloat(entryPrice);
      const exit = exitPrice ? parseFloat(exitPrice) : null;
      const tradeStatus = exit ? 'closed' : 'open';

      let pnl = null;
      let pnlPercent = null;
      if (exit) {
        pnl = type === 'long'
          ? (exit - entry) * shares
          : (entry - exit) * shares;
        pnlPercent = type === 'long'
          ? ((exit - entry) / entry) * 100
          : ((entry - exit) / entry) * 100;
      }

      const { error } = await supabase.from('trades').insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        type,
        entry_price: entry,
        exit_price: exit,
        shares,
        entry_date: entryDate,
        exit_date: exitDate || null,
        status: tradeStatus,
        pnl,
        pnl_percent: pnlPercent,
        setup_tag: setupTag || null,
        emotion_tag: emotionTag || null,
        notes: notes || null,
      });

      if (error) throw error;

      router.push('/trades');
    } catch (err) {
      console.error('Save error:', err);
      alert('Gagal menyimpan trade: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // P&L preview
  const pnlPreview = (() => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const shares = parseInt(lots) * 100;
    if (!entry || !exit || !shares) return null;

    const pnl = type === 'long' ? (exit - entry) * shares : (entry - exit) * shares;
    const pnlPct = type === 'long' ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
    return { pnl, pnlPct };
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-white">Quick Add Trade</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Klik di chart untuk set harga entry & exit
        </p>
      </div>

      {/* Ticker search */}
      <div className="relative max-w-xs">
        <label className="block text-xs text-zinc-500 mb-1.5">Cari Saham</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Ketik ticker... (BBRI, BBCA, dll)"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2.5 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono uppercase"
        />
        {showDropdown && filteredTickers.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/[0.08] rounded-lg overflow-hidden shadow-xl">
            {filteredTickers.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTicker(t);
                  setSearchQuery(t);
                  setShowDropdown(false);
                  // Reset form
                  setEntryPrice('');
                  setExitPrice('');
                  setEntryDate('');
                  setExitDate('');
                  setClickMode('entry');
                }}
                className="w-full text-left px-3 py-2 text-sm font-mono text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
              >
                {t}<span className="text-zinc-600">.JK</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content: Chart + Form */}
      {ticker && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Chart (2/3) */}
          <div className="xl:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Chart header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-semibold text-white">{ticker}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  type === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {type}
                </span>
              </div>

              {/* Click mode indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Klik chart untuk set:</span>
                <button
                  onClick={() => setClickMode('entry')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    clickMode === 'entry'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Entry
                </button>
                <button
                  onClick={() => setClickMode('exit')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    clickMode === 'exit'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Chart area */}
            <div className="relative" style={{ minHeight: 460 }}>
              {chartLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-mono">Loading {ticker}.JK...</span>
                  </div>
                </div>
              )}
              {chartError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-center px-4">
                    <p className="text-sm text-red-400">{chartError}</p>
                    <p className="text-xs text-slate-500 mt-1">Pastikan ticker valid</p>
                  </div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full" />
            </div>

            {/* Instructions */}
            <div className="px-4 py-2 border-t border-white/[0.06] text-[11px] text-zinc-500 flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                BUY / Entry
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                SELL / Exit
              </span>
              <span className="text-zinc-600">|</span>
              <span>Klik candle di chart → harga otomatis terisi</span>
            </div>
          </div>

          {/* Form (1/3) */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-medium text-white">Detail Trade</h3>

            {/* Type */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Tipe</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setType('long')}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    type === 'long'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.03] text-zinc-500'
                  }`}
                >
                  Long ↑
                </button>
                <button
                  onClick={() => setType('short')}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    type === 'short'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'bg-white/[0.03] text-zinc-500'
                  }`}
                >
                  Short ↓
                </button>
              </div>
            </div>

            {/* Entry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  Entry Price
                  {clickMode === 'entry' && (
                    <span className="ml-1 text-emerald-400 animate-pulse">← klik chart</span>
                  )}
                </label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="Klik chart"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Entry Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            {/* Exit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">
                  Exit Price
                  {clickMode === 'exit' && (
                    <span className="ml-1 text-red-400 animate-pulse">← klik chart</span>
                  )}
                </label>
                <input
                  type="number"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Klik chart / kosong"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Exit Date</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            {/* Lot */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Jumlah Lot</label>
              <input
                type="number"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                placeholder="10"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
              {lots && <p className="text-[11px] text-zinc-600 mt-1">= {parseInt(lots || 0) * 100} lembar</p>}
            </div>

            {/* Setup & Emotion */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Setup</label>
                <select
                  value={setupTag}
                  onChange={(e) => setSetupTag(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                >
                  <option className="bg-[#1a1a24] text-white" value="">Pilih...</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Pullback / Retracement">Pullback</option>
                  <option value="Support Bounce">Support Bounce</option>
                  <option value="Moving Average">Moving Average</option>
                  <option value="Gap Up/Down">Gap Up/Down</option>
                  <option value="MACD Cross">MACD Cross</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Emosi</label>
                <select
                  value={emotionTag}
                  onChange={(e) => setEmotionTag(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                >
                  <option value="" className="bg-[#1a1a24] text-white">Pilih...</option>
                  <option value="Confident 😎">Confident 😎</option>
                  <option value="Tenang 😌">Tenang 😌</option>
                  <option value="FOMO 😰">FOMO 😰</option>
                  <option value="Serakah 🤑">Serakah 🤑</option>
                  <option value="Takut 😨">Takut 😨</option>
                  <option value="Revenge 😤">Revenge 😤</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alasan entry, analisis, lesson learned..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none"
              />
            </div>

            {/* P&L Preview */}
            {pnlPreview && (
              <div className={`rounded-lg p-3 text-center ${
                pnlPreview.pnl >= 0
                  ? 'bg-emerald-500/[0.06] border border-emerald-500/20'
                  : 'bg-red-500/[0.06] border border-red-500/20'
              }`}>
                <p className="text-[11px] text-zinc-500 mb-0.5">Preview P&L</p>
                <p className={`text-lg font-mono font-bold ${
                  pnlPreview.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {pnlPreview.pnl >= 0 ? '+' : ''}{formatRp(pnlPreview.pnl)}
                </p>
                <p className={`text-xs font-mono ${
                  pnlPreview.pnl >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                }`}>
                  {pnlPreview.pnlPct >= 0 ? '+' : ''}{pnlPreview.pnlPct.toFixed(2)}%
                </p>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!ticker || !entryPrice || !lots || !entryDate || saving}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? 'Menyimpan...' : 'Simpan Trade'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRp(num) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
