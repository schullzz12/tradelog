// app/api/chart-data/route.js
// Proxy Yahoo Finance OHLC data for TradingView Lightweight Charts
// This avoids CORS issues and keeps the Yahoo Finance URL server-side

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');

  if (!ticker || !period1 || !period2) {
    return NextResponse.json(
      { error: 'Missing required params: ticker, period1, period2' },
      { status: 400 }
    );
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradeLog/1.0)',
      },
      // Cache for 5 minutes to avoid rate limiting
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error('Yahoo Finance error:', res.status, res.statusText);
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Extract OHLC from Yahoo response
    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json(
        { error: 'No data found for ticker' },
        { status: 404 }
      );
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const ohlcData = timestamps
      .map((ts, i) => {
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i];

        // Skip null candles (holidays/weekends)
        if (open == null || high == null || low == null || close == null) {
          return null;
        }

        // Convert Unix timestamp to YYYY-MM-DD
        const date = new Date(ts * 1000);
        const time = date.toISOString().split('T')[0];

        return {
          time,
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: volume || 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json(ohlcData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('Chart data proxy error:', err);
    return NextResponse.json(
      { error: 'Internal server error fetching chart data' },
      { status: 500 }
    );
  }
}