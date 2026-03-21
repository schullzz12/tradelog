// app/api/top-stocks/route.js
// Fetch top 5 IDX stocks of the month using Gemini + Google Search grounding
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { month, year } = await request.json();

  if (!month || !year) {
    return NextResponse.json({ error: 'month and year required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const geminiUrl = (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const monthName = monthNames[parseInt(month) - 1] || month;

  try {
    // STEP 1: Search for top performing IDX stocks
    const searchPrompt = `Cari 5 saham di Bursa Efek Indonesia (IDX) yang mengalami kenaikan harga paling besar selama bulan ${monthName} ${year}. 

Untuk setiap saham berikan:
1. Kode saham (ticker)
2. Nama perusahaan
3. Persentase kenaikan harga selama bulan tersebut
4. Harga awal dan akhir bulan
5. Alasan utama kenapa saham tersebut naik (berita, laporan keuangan, sentimen pasar, dll)

Fokus pada saham yang benar-benar naik signifikan. Gunakan data dari sumber terpercaya seperti IDX, CNBC Indonesia, Kontan, Bisnis.com.`;

    const searchRes = await fetch(geminiUrl('gemini-2.5-flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
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

    // Extract sources
    let sources = [];
    const groundingMeta = searchData?.candidates?.[0]?.groundingMetadata;
    if (groundingMeta?.groundingChunks) {
      sources = groundingMeta.groundingChunks
        .filter((c) => c.web)
        .map((c) => ({ title: c.web.title || '', uri: c.web.uri || '' }))
        .slice(0, 6);
    }

    // STEP 2: Structure into JSON
    const structurePrompt = `Berdasarkan data berikut tentang saham-saham IDX yang naik paling banyak di bulan ${monthName} ${year}, buat JSON.

DATA:
${searchText.slice(0, 6000)}

Buat JSON dengan struktur EXACT seperti ini:
{
  "month": "${monthName}",
  "year": ${year},
  "stocks": [
    {
      "ticker": "KODE",
      "company_name": "Nama Perusahaan Lengkap",
      "change_percent": 45.5,
      "price_start": 1000,
      "price_end": 1455,
      "reason": "Penjelasan singkat 1-2 kalimat kenapa saham ini naik"
    }
  ]
}

PENTING: 
- Urutkan dari kenaikan terbesar ke terkecil
- change_percent harus angka (bukan string)
- price_start dan price_end harus angka (bukan string), kalau tidak tersedia bisa null
- Maksimal 5 saham
- Pastikan output valid JSON`;

    const structureRes = await fetch(geminiUrl('gemini-2.5-flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: structurePrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
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
    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (e) {
      try {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) result = JSON.parse(match[0]);
      } catch (e2) {
        console.error('JSON parse failed:', e2.message);
      }
    }

    if (!result || !Array.isArray(result.stocks)) {
      return NextResponse.json({
        month: monthName,
        year,
        stocks: [],
        sources,
        error: 'Could not parse top stocks data',
      });
    }

    // Sanitize
    result.stocks = result.stocks.slice(0, 5).map((s) => ({
      ticker: (s.ticker || '').toUpperCase(),
      company_name: s.company_name || s.ticker,
      change_percent: typeof s.change_percent === 'number' ? s.change_percent : parseFloat(s.change_percent) || 0,
      price_start: typeof s.price_start === 'number' ? s.price_start : null,
      price_end: typeof s.price_end === 'number' ? s.price_end : null,
      reason: s.reason || 'Tidak ada data',
    }));

    result.sources = sources;

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('Top stocks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
