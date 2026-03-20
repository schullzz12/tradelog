// app/api/ai-analysis/route.js
// 2-step approach with Supabase cache (2 hour expiry)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
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
        // Cache hit — return cached analysis
        return NextResponse.json(cached.analysis, {
          headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
        });
      }
    }
  } catch (err) {
    // Cache miss or error — continue to fetch from Gemini
    console.log('Cache miss for', tickerUpper);
  }

  // ═══════════════════════════════════════════
  // CACHE MISS — FETCH FROM GEMINI
  // ═══════════════════════════════════════════
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const geminiUrl = (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    // STEP 1: Search for latest info (free text)
    const searchPrompt = `Cari informasi terbaru tentang saham ${tickerUpper} yang listed di Bursa Efek Indonesia (IDX). Berikan:

1. Nama lengkap perusahaan
2. Berita terbaru yang mempengaruhi harga saham (minimal 2-3 berita)
3. Data laporan keuangan terakhir: revenue, laba bersih, EPS, PER, PBV
4. Kondisi teknikal harga saham terkini
5. Risiko dan katalis potensial
6. Sentiment pasar saat ini

Berikan informasi selengkap mungkin dalam bahasa Indonesia.`;

    const searchRes = await fetch(geminiUrl('gemini-2.5-flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error('Step 1 error:', searchRes.status, errText);
      return NextResponse.json({ error: `Search failed: ${searchRes.status}` }, { status: 502 });
    }

    const searchData = await searchRes.json();

    const searchParts = searchData?.candidates?.[0]?.content?.parts || [];
    const searchText = searchParts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('\n');

    if (!searchText) {
      return NextResponse.json({ error: 'No search results' }, { status: 502 });
    }

    // Extract grounding sources
    let sources = [];
    const groundingMeta = searchData?.candidates?.[0]?.groundingMetadata;
    if (groundingMeta?.groundingChunks) {
      sources = groundingMeta.groundingChunks
        .filter((c) => c.web)
        .map((c) => ({ title: c.web.title || '', uri: c.web.uri || '' }))
        .slice(0, 6);
    }

    // STEP 2: Structure into JSON (no search tool)
    const structurePrompt = `Berdasarkan data berikut tentang saham ${tickerUpper}, buat analisis dalam format JSON.

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

PENTING: Isi semua field berdasarkan data di atas. Jika data tidak tersedia, tulis "Data tidak tersedia". Pastikan output adalah valid JSON.`;

    const structureRes = await fetch(geminiUrl('gemini-2.5-flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: structurePrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!structureRes.ok) {
      const errText = await structureRes.text();
      console.error('Step 2 error:', structureRes.status, errText);
      return NextResponse.json({ error: `Structure failed: ${structureRes.status}` }, { status: 502 });
    }

    const structureData = await structureRes.json();

    const structureParts = structureData?.candidates?.[0]?.content?.parts || [];
    const jsonText = structureParts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');

    if (!jsonText) {
      return NextResponse.json({ error: 'No structured response' }, { status: 502 });
    }

    // Parse JSON
    let analysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch (e) {
      try {
        const match = jsonText.match(/\{[\s\S]*\}/);
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
        sources,
        raw: true,
      });
    }

    // Ensure fields exist
    analysis.ticker = analysis.ticker || tickerUpper;
    analysis.sentiment = analysis.sentiment || 'Neutral';
    analysis.sentiment_score = analysis.sentiment_score || 5;
    analysis.news = Array.isArray(analysis.news) ? analysis.news : [];
    analysis.risks = Array.isArray(analysis.risks) ? analysis.risks : [];
    analysis.catalysts = Array.isArray(analysis.catalysts) ? analysis.catalysts : [];
    analysis.financials = analysis.financials || { summary: 'Data tidak tersedia' };
    analysis.sources = sources;

    // ═══════════════════════════════════════════
    // SAVE TO CACHE (upsert)
    // ═══════════════════════════════════════════
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
      // Non-blocking — still return the analysis
    }

    return NextResponse.json(analysis, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
    });
  } catch (err) {
    console.error('AI analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
