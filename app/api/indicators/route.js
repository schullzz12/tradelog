import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }

  try {
    // Fetch 3 months of data for indicator calculation
    const now = Math.floor(Date.now() / 1000);
    const threeMonthsAgo = now - 90 * 24 * 60 * 60;

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}.JK?period1=${threeMonthsAgo}&period2=${now}&interval=1d&includePrePost=false`;

    const res = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradeLog/1.0)' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    // Build clean OHLCV array
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = quote.close?.[i];
      const v = quote.volume?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      if (c != null && v != null) {
        candles.push({ close: c, volume: v, high: h, low: l });
      }
    }

    if (candles.length < 20) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 });
    }

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    // Current price
    const lastPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - 2];
    const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

    // RSI (14)
    const rsi = calcRSI(closes, 14);

    // Moving Averages
    const ma5 = calcMA(closes, 5);
    const ma20 = calcMA(closes, 20);
    const ma50 = calcMA(closes, 50);

    // MA Cross signal
    let maCross = 'neutral';
    if (ma5 !== null && ma20 !== null) {
      if (ma5 > ma20) maCross = 'bullish';
      else if (ma5 < ma20) maCross = 'bearish';
    }

    // Volume trend (avg 20 vs avg 5)
    const volAvg20 = calcMA(volumes, 20);
    const volAvg5 = calcMA(volumes, 5);
    let volumeTrend = 'normal';
    if (volAvg5 !== null && volAvg20 !== null) {
      const ratio = volAvg5 / volAvg20;
      if (ratio > 1.5) volumeTrend = 'high';
      else if (ratio < 0.6) volumeTrend = 'low';
    }

    // Support & Resistance (simple: 20-day low/high)
    const recent20 = candles.slice(-20);
    const support = Math.min(...recent20.map((c) => c.low));
    const resistance = Math.max(...recent20.map((c) => c.high));

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      lastPrice: Math.round(lastPrice),
      changePercent: Math.round(changePercent * 100) / 100,
      rsi: rsi !== null ? Math.round(rsi * 100) / 100 : null,
      ma5: ma5 !== null ? Math.round(ma5) : null,
      ma20: ma20 !== null ? Math.round(ma20) : null,
      ma50: ma50 !== null ? Math.round(ma50) : null,
      maCross,
      volumeTrend,
      volAvg5: volAvg5 !== null ? Math.round(volAvg5) : null,
      volAvg20: volAvg20 !== null ? Math.round(volAvg20) : null,
      support: Math.round(support),
      resistance: Math.round(resistance),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('Indicators error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helper functions ──

function calcRSI(closes, period) {
  if (closes.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
