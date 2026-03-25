// app/api/ai-analysis/route.js
// 2-step approach with OpenRouter (GPT-4o-mini) + Supabase cache (2 hour expiry)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

async function callOpenRouter(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://tradelog-omega.vercel.app',
      'X-Title': 'TradeLog AI Analysis',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenRouter error:', res.status, errText);
    throw new Error(`OpenRouter returned ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request) {
  // Rate limit by IP: 10 per hour
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const { allowed, resetAt } = checkRateLimit(ip, 'ai-analysis', 10);
  if (!allowed) return rateLimitResponse(resetAt);

  const { ticker } = await request.json();

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
  }

  const tickerUpper = ticker.toUpperCase();

  // ═══════════════════════════════════════════
  // CHECK CACHE FIRST (2 hour expiry)
  // ═══════════════════════════════════════════
  try {
    const { data: cached } = await supabaseAdmin
      .from('ai_analysis_cache')
      .select('analysis, created_at')
      .eq('ticker', tickerUpper)
      .single();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.created_at).getTime();
      const twoHours = 2 * 60 * 60 * 1000;

      if (cacheAge < twoHours) {
        return NextResponse.json(cached.analysis, {
          headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
        });
      }
    }
  } catch (err) {
    console.log('Cache miss for', tickerUpper);
  }

  // ═══════════════════════════════════════════
  // CACHE MISS — FETCH FROM OPENROUTER
  // ═══════════════════════════════════════════
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
  }

  try {
    // STEP 1: Search for latest info
    const searchText = await callOpenRouter([
      {
        role: 'system',
        content: 'Kamu adalah analis saham Indonesia yang ahli. Berikan informasi terbaru dan akurat tentang saham yang ditanyakan. Jawab dalam bahasa Indonesia.',
      },
      {
        role: 'user',
        content: `Cari informasi terbaru tentang saham ${tickerUpper} yang listed di Bursa Efek Indonesia (IDX). Berikan:

1. Nama lengkap perusahaan
2. Berita terbaru yang mempengaruhi harga saham (minimal 2-3 berita)
3. Data laporan keuangan terakhir: revenue, laba bersih, EPS, PER, PBV
4. Kondisi teknikal harga saham terkini
5. Risiko dan katalis potensial
6. Sentiment pasar saat ini

Berikan informasi selengkap mungkin dalam bahasa Indonesia.`,
      },
    ], { temperature: 0.3, maxTokens: 2000 });

    if (!searchText) {
      return NextResponse.json({ error: 'No search results' }, { status: 502 });
    }

    // STEP 2: Structure into JSON
    const jsonText = await callOpenRouter([
      {
        role: 'system',
        content: 'Kamu adalah data formatter. Output HANYA valid JSON, tanpa markdown, tanpa backticks, tanpa teks lain.',
      },
      {
        role: 'user',
        content: `Berdasarkan data berikut tentang saham ${tickerUpper}, buat analisis dalam format JSON.

DATA:
${searchText.slice(0, 6000)}

Buat JSON dengan struktur EXACT seperti ini:
{
  "ticker": "${tickerUpper}",
  "company_name": "nama lengkap perusahaan",
  "sentiment": "Bullish" atau "Bearish" atau "Neutral",
  "sentiment_score": angka 1-10 (1=sangat bearish, 10=sangat bullish),
  "summary": "ringkasan 2-3 kalimat kondisi saham saat ini",
  "news": [
    {"title": "judul berita", "summary": "ringkasan 1 kalimat", "impact": "Positive" atau "Negative" atau "Neutral"}
  ],
  "financials": {
    "revenue": "angka revenue + periode",
    "net_profit": "angka laba bersih + periode",
    "eps": "EPS value",
    "per": "PER value",
    "pbv": "PBV value",
    "summary": "ringkasan keuangan 1-2 kalimat"
  },
  "risks": ["risiko 1", "risiko 2", "risiko 3"],
  "catalysts": ["katalis 1", "katalis 2", "katalis 3"],
  "key_insight": "satu insight paling penting untuk trader"
}

PENTING: Isi semua field berdasarkan data di atas. Jika data tidak tersedia, tulis "Data tidak tersedia". Output HANYA valid JSON.`,
      },
    ], { temperature: 0.1, maxTokens: 3000 });

    if (!jsonText) {
      return NextResponse.json({ error: 'No structured response' }, { status: 502 });
    }

    // Parse JSON — clean up potential markdown fences
    let cleaned = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (e) {
      try {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
      } catch (e2) {
        console.error('JSON parse failed:', e2.message);
      }
    }

    if (!analysis) {
      return NextResponse.json({
        ticker: tickerUpper,
        company_name: tickerUpper,
        sentiment: 'Neutral',
        sentiment_score: 5,
        summary: searchText.slice(0, 500),
        news: [],
        financials: { summary: 'Data tidak tersedia' },
        risks: [],
        catalysts: [],
        key_insight: 'Analisis tersedia tapi format tidak dapat diproses.',
        sources: [],
        raw: true,
      });
    }

    // Ensure fields exist + sanitize
    analysis.ticker = analysis.ticker || tickerUpper;
    analysis.sentiment = ['Bullish', 'Bearish', 'Neutral'].includes(analysis.sentiment) ? analysis.sentiment : 'Neutral';
    
    let score = parseFloat(analysis.sentiment_score);
    if (isNaN(score) || score < 1 || score > 10) score = 5;
    analysis.sentiment_score = Math.round(score);

    analysis.summary = (typeof analysis.summary === 'string' && analysis.summary !== 'Data tidak tersedia') 
      ? analysis.summary : 'Analisis sedang diproses.';
    analysis.news = Array.isArray(analysis.news) ? analysis.news.filter(n => n && n.title && n.title !== 'Data tidak tersedia') : [];
    analysis.risks = Array.isArray(analysis.risks) ? analysis.risks.filter(r => r && r !== 'Data tidak tersedia') : [];
    analysis.catalysts = Array.isArray(analysis.catalysts) ? analysis.catalysts.filter(c => c && c !== 'Data tidak tersedia') : [];
    analysis.financials = analysis.financials || { summary: 'Data tidak tersedia' };
    analysis.key_insight = (typeof analysis.key_insight === 'string' && analysis.key_insight !== 'Data tidak tersedia')
      ? analysis.key_insight : null;
    analysis.sources = [];

    // Save to cache
    const hasRealData = analysis.news.length > 0 || analysis.risks.length > 0 || (analysis.financials.revenue && analysis.financials.revenue !== 'Data tidak tersedia');

    if (hasRealData) {
      try {
        await supabaseAdmin
          .from('ai_analysis_cache')
          .upsert(
            {
              ticker: tickerUpper,
              analysis: analysis,
              created_at: new Date().toISOString(),
            },
            { onConflict: 'ticker' }
          );
      } catch (cacheErr) {
        console.error('Cache save error:', cacheErr);
      }
    }

    return NextResponse.json(analysis, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
    });
  } catch (err) {
    console.error('AI analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
