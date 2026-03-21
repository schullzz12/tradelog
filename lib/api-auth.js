// lib/api-auth.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getAuthUser(request) {
  try {
    // Get access token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Try Authorization header first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) return { user, error: null };
    }

    // Try extracting token from Supabase cookies
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
      })
    );

    // Supabase stores tokens in cookies with pattern: sb-{ref}-auth-token
    const tokenCookie = Object.entries(cookies).find(([key]) => 
      key.includes('auth-token') || key.includes('access-token')
    );

    if (tokenCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(tokenCookie[1]));
        const accessToken = parsed?.access_token || parsed;
        if (accessToken && typeof accessToken === 'string') {
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          if (user && !error) return { user, error: null };
        }
      } catch {}
    }

    // Try all cookies that look like JWT tokens
    for (const [key, val] of Object.entries(cookies)) {
      if (val && val.startsWith('ey')) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(val);
          if (user && !error) return { user, error: null };
        } catch {}
      }
    }

    return { user: null, error: 'Unauthorized' };
  } catch (err) {
    return { user: null, error: 'Auth check failed' };
  }
}

// ── Rate Limiter (in-memory) ────────────────────────────────────────

const rateLimitStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function checkRateLimit(userId, endpoint, maxRequests, windowMs = 60 * 60 * 1000) {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  let data = rateLimitStore.get(key);

  if (!data || now - data.windowStart > windowMs) {
    data = { count: 0, windowStart: now, windowMs };
    rateLimitStore.set(key, data);
  }
  data.count++;

  const remaining = Math.max(0, maxRequests - data.count);
  const resetAt = data.windowStart + windowMs;

  return {
    allowed: data.count <= maxRequests,
    remaining,
    resetAt,
  };
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized. Please login.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

export function rateLimitResponse(resetAt) {
  const resetIn = Math.ceil((resetAt - Date.now()) / 60000);
  return new Response(
    JSON.stringify({ error: `Terlalu banyak request. Coba lagi dalam ${resetIn} menit.` }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}