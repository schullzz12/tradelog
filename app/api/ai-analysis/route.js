// app/api/ai-analysis/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { ticker } = await request.json();

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const prompt = `Kamu analis saham Indonesia. Analisis saham ${ticker.toUpperCase()} di IDX.

Cari berita terbaru dan data keuangan, lalu berikan analisis lengkap dalam format JSON berikut:

{
  "ticker": "${ticker.toUpperCase()}",
  "company_name": "nama lengkap perusahaan",
  "sentiment": "Bullish" atau "Bearish" atau "Neutral",
  "sentiment_score": angka 1 sampai 10,
  "summary": "ringkasan 2-3 kalimat kondisi saham saat ini dalam bahasa Indonesia",
  "news": [
    {"title": "judul berita 1", "summary": "ringkasan singkat", "impact": "Positive"},
    {"title": "judul berita 2", "summary": "ringkasan singkat", "impact": "Negative"}
  ],
  "financials": {
    "revenue": "info revenue terakhir",
    "net_profit": "info laba bersih",
    "eps": "earnings per share",
    "per": "price to earnings ratio",
    "pbv": "price to book value",
    "summary": "ringkasan kondisi keuangan 1-2 kalimat"
  },
  "risks": ["risiko 1", "risiko 2", "risiko 3"],
  "catalysts": ["katalis positif 1", "katalis positif 2", "katalis positif 3"],
  "key_insight": "satu insight paling penting yang harus diperhatikan trader"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      return NextResponse.json({ error: `Gemini API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // Collect all text parts
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const allText = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');

    if (!allText) {
      return NextResponse.json({ error: 'No response from Gemini' }, { status: 502 });
    }

    console.log('Gemini raw response length:', allText.length);

    // Parse JSON — with responseMimeType it should be clean JSON
    let analysis = null;

    // Try 1: Direct parse
    try {
      analysis = JSON.parse(allText);
    } catch (e) {
      console.log('Direct parse failed, trying extraction...');
    }

    // Try 2: Extract first complete JSON object
    if (!analysis) {
      try {
        // Find the first { and match to its closing }
        const startIdx = allText.indexOf('{');
        if (startIdx !== -1) {
          let depth = 0;
          let endIdx = -1;
          for (let i = startIdx; i < allText.length; i++) {
            if (allText[i] === '{') depth++;
            if (allText[i] === '}') depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
          if (endIdx !== -1) {
            const jsonStr = allText.substring(startIdx, endIdx + 1);
            analysis = JSON.parse(jsonStr);
          }
        }
      } catch (e) {
        console.error('Extraction parse failed:', e.message);
      }
    }

    // Try 3: Clean up and retry
    if (!analysis) {
      try {
        const cleaned = allText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .trim();
        analysis = JSON.parse(cleaned);
      } catch (e) {
        console.error('Cleaned parse failed:', e.message);
      }
    }

    // Fallback
    if (!analysis) {
      analysis = {
        ticker: ticker.toUpperCase(),
        company_name: ticker.toUpperCase(),
        sentiment: 'Neutral',
        sentiment_score: 5,
        summary: allText.slice(0, 500).replace(/[{}"\[\]]/g, '').trim(),
        news: [],
        financials: { summary: 'Data tidak tersedia' },
        risks: [],
        catalysts: [],
        key_insight: 'Analisis tersedia tapi format tidak dapat diproses.',
        raw: true,
      };
    }

    // Ensure required fields exist
    analysis.ticker = analysis.ticker || ticker.toUpperCase();
    analysis.sentiment = analysis.sentiment || 'Neutral';
    analysis.sentiment_score = analysis.sentiment_score || 5;
    analysis.news = Array.isArray(analysis.news) ? analysis.news : [];
    analysis.risks = Array.isArray(analysis.risks) ? analysis.risks : [];
    analysis.catalysts = Array.isArray(analysis.catalysts) ? analysis.catalysts : [];
    analysis.financials = analysis.financials || { summary: 'Data tidak tersedia' };

    // Extract grounding sources
    const groundingMeta = data?.candidates?.[0]?.groundingMetadata;
    if (groundingMeta?.groundingChunks) {
      analysis.sources = groundingMeta.groundingChunks
        .filter((c) => c.web)
        .map((c) => ({ title: c.web.title || '', uri: c.web.uri || '' }))
        .slice(0, 5);
    }

    return NextResponse.json(analysis, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
    });
  } catch (err) {
    console.error('AI analysis error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
