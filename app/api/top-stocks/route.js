// app/api/top-stocks/route.js
// Hybrid: Yahoo Finance real data + Gemini for explanations only
import { NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-auth';

// 50+ most active IDX stocks
const IDX_TICKERS = [
  'BBCA','BBRI','BMRI','BBNI','BRIS','BBTN','BTPS','BJTM',
  'TLKM','ASII','GOTO','BREN','AMMN','ANTM','INDF','ICBP',
  'UNVR','HMSP','GGRM','KLBF','SIDO','MAPI','ACES','ERAA',
  'MDKA','ADRO','ITMG','PTBA','MEDC','INCO','TINS','NCKL',
  'CPIN','JPFA','MAIN','TBIG','TOWR','EXCL','ISAT','MTEL',
  'SMGR','INTP','WIKA','WSKT','PTPP','JSMR','PGAS','AKRA',
  'ESSA','BRPT','TPIA','INKP','SMMA','BUKA','EMTK','SCMA',
  'ARTO','BBYB','FILM','PGEO','MBMA','HRUM','DSSA','MYOR',
  'UNTR','AALI','LSIP','TAPG','RAJA','ARKO','SRTG','BSDE',
  'CTRA','SMRA','PWON','DMAS','PANI',
];

export async function POST(request) {
  // Rate limit by IP: 5 per hour
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const { allowed, resetAt } = checkRateLimit(ip, 'top-stocks', 5);
  if (!allowed) return rateLimitResponse(resetAt);

  const { month, year } = await request.json();

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year required' }, { status: 400 });
  }

  const monthNames = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember',
  ];
  const monthIdx = parseInt(month) - 1;
  const monthName = monthNames[monthIdx] || month;

  try {
    const monthStart = new Date(parseInt(year), monthIdx, 1);
    const monthEnd = new Date(parseInt(year), monthIdx + 1, 0);
    const now = new Date();
    const end = monthEnd > now ? now : monthEnd;

    const period1 = Math.floor(monthStart.getTime() / 1000) - 3 * 86400;
    const period2 = Math.floor(end.getTime() / 1000) + 86400;

    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const batchSize = 15;
    const allResults = [];

    for (let i = 0; i < IDX_TICKERS.length; i += batchSize) {
      const batch = IDX_TICKERS.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (ticker) => {
          try {
            const url = `${getBaseUrl(request)}/api/chart-data?ticker=${ticker}.JK&period1=${period1}&period2=${period2}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data || data.length < 2) return null;

            const startCandle = data.find((d) => d.time >= startStr) || data[0];
            const endCandidates = data.filter((d) => d.time <= endStr);
            const endCandle = endCandidates.length > 0 ? endCandidates[endCandidates.length - 1] : data[data.length - 1];

            if (!startCandle || !endCandle || !startCandle.close || !endCandle.close) return null;

            const changePct = ((endCandle.close - startCandle.close) / startCandle.close) * 100;

            return {
              ticker,
              price_start: Math.round(startCandle.close),
              price_end: Math.round(endCandle.close),
              change_percent: Math.round(changePct * 10) / 10,
            };
          } catch (err) {
            return null;
          }
        })
      );
      allResults.push(...batchResults);
    }

    const ranked = allResults
      .filter((r) => r && r.change_percent > 0)
      .sort((a, b) => b.change_percent - a.change_percent)
      .slice(0, 5);

    if (ranked.length === 0) {
      return NextResponse.json({
        month: monthName,
        year: parseInt(year),
        stocks: [],
        sources: [],
      });
    }

    const enriched = await enrichWithGemini(ranked, monthName, year);

    return NextResponse.json(
      {
        month: monthName,
        year: parseInt(year),
        stocks: enriched,
        sources: [{ title: 'Yahoo Finance', uri: 'https://finance.yahoo.com' }],
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (err) {
    console.error('Top stocks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getBaseUrl(request) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function enrichWithGemini(stocks, monthName, year) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return stocks.map((s) => ({
      ...s,
      company_name: s.ticker,
      reason: `Naik ${s.change_percent}% selama ${monthName} ${year}.`,
    }));
  }

  const tickerList = stocks.map((s) => `${s.ticker} (${s.change_percent > 0 ? '+' : ''}${s.change_percent}%)`).join(', ');

  const prompt = `Berikut 5 saham IDX yang naik paling banyak di bulan ${monthName} ${year}: ${tickerList}

Untuk setiap saham, berikan:
1. Nama perusahaan lengkap (contoh: PT Bank Central Asia Tbk)
2. Alasan spesifik kenapa saham tersebut naik (berita, laporan keuangan, aksi korporasi, sentimen sektor)

Jawab dalam JSON array saja, tanpa teks lain:
[
  {"ticker": "BBCA", "company_name": "PT Bank Central Asia Tbk", "reason": "Penjelasan 1-2 kalimat"},
  ...
]`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let rawText = parts.filter((p) => p.text).map((p) => p.text).join('');

    if (!rawText) throw new Error('Empty response');

    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      rawText = rawText.slice(firstBracket, lastBracket + 1);
    }
    rawText = rawText.replace(/,\s*([}\]])/g, '$1');

    let aiData;
    try {
      aiData = JSON.parse(rawText);
    } catch (e) {
      throw new Error('JSON parse failed');
    }

    if (!Array.isArray(aiData)) throw new Error('Not an array');

    return stocks.map((s) => {
      const ai = aiData.find((a) => a.ticker?.toUpperCase() === s.ticker);
      return {
        ...s,
        company_name: ai?.company_name || s.ticker,
        reason: ai?.reason || `Naik ${s.change_percent}% selama ${monthName} ${year}.`,
      };
    });
  } catch (err) {
    console.error('Gemini enrich error:', err.message);
    return stocks.map((s) => ({
      ...s,
      company_name: s.ticker,
      reason: `Naik ${s.change_percent}% selama ${monthName} ${year}.`,
    }));
  }
}
