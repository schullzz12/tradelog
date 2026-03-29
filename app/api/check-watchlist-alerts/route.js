import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const THRESHOLD = 0.02; // 2% dari entry

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  if (wibHour < 9 || wibHour >= 16) {
    return Response.json({ message: "Outside trading hours" });
  }

  const { data: items } = await supabase
    .from("watchlist")
    .select("*, users:user_id(email)")
    .eq("alert_enabled", true)
    .not("entry_price", "is", null);

  if (!items?.length) return Response.json({ checked: 0 });

  const tickers = [...new Set(items.map(i => i.ticker + ".JK"))];
  const prices = await fetchPrices(tickers);

  let alertsSent = 0;

  for (const item of items) {
    const cur = prices[item.ticker + ".JK"];
    if (!cur) continue;

    await supabase.from("watchlist").update({ last_price: cur, last_checked_at: now }).eq("id", item.id);

    const nearEntry = Math.abs(cur - item.entry_price) / item.entry_price <= THRESHOLD;
    const hitTP = item.tp_price && cur >= item.tp_price;
    const hitSL = item.sl_price && cur <= item.sl_price;

    if (!nearEntry && !hitTP && !hitSL) continue;

    if (item.alert_sent_at) {
      const lastSent = new Date(item.alert_sent_at);
      if ((now - lastSent) < 4 * 60 * 60 * 1000) continue;
    }

    const userEmail = item.users?.email;
    if (!userEmail) continue;

    const alertType = hitTP ? "take_profit" : hitSL ? "stop_loss" : "entry";
    await sendAlert({ item, cur, alertType, userEmail });
    await supabase.from("watchlist").update({ alert_sent_at: now }).eq("id", item.id);
    alertsSent++;
  }

  return Response.json({ checked: items.length, alertsSent });
}

async function fetchPrices(tickers) {
  const prices = {};
  await Promise.all(tickers.map(async ticker => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chart-data?ticker=${ticker}&range=1d&interval=1m`);
      const data = await res.json();
      if (data?.quotes?.length) prices[ticker] = data.quotes[data.quotes.length - 1].close;
    } catch {}
  }));
  return prices;
}

async function sendAlert({ item, cur, alertType, userEmail }) {
  const labels = {
    entry: { subject: `TradeLog: ${item.ticker} mendekati entry plan kamu`, color: "#10b981", badge: "ENTRY ZONE" },
    take_profit: { subject: `TradeLog: ${item.ticker} menyentuh Take Profit!`, color: "#10b981", badge: "TAKE PROFIT" },
    stop_loss: { subject: `TradeLog: ${item.ticker} menyentuh Stop Loss`, color: "#ef4444", badge: "STOP LOSS" },
  };
  const { subject, color, badge } = labels[alertType];
  const distPct = (((cur - item.entry_price) / item.entry_price) * 100).toFixed(1);

  await resend.emails.send({
    from: "TradeLog <alert@tradelog.co.id>",
    to: userEmail,
    subject,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="margin-bottom:24px">
      <span style="color:#10b981;font-size:18px;font-weight:600">TradeLog</span>
    </div>
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:12px;padding:24px">
      <div style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}40;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:500;margin-bottom:16px">${badge}</div>
      <h2 style="color:#e4e4ed;font-size:20px;margin:0 0 4px">${item.ticker}</h2>
      <p style="color:#52525b;font-size:13px;margin:0 0 20px">
        Harga sekarang: <strong style="color:#e4e4ed">Rp ${cur.toLocaleString("id-ID")}</strong> ·
        ${Math.abs(distPct)}% ${+distPct > 0 ? "di atas" : "di bawah"} entry plan kamu
      </p>
      ${item.reasoning ? `
      <div style="background:#0a0a0f;border-left:3px solid ${color};padding:12px 16px;margin-bottom:20px;border-radius:0 6px 6px 0">
        <p style="color:#a1a1aa;font-size:13px;margin:0;font-style:italic">"${item.reasoning}"</p>
      </div>` : ""}
      <table style="width:100%;border-collapse:separate;border-spacing:6px">
        <tr>
          <td style="background:#0a0a0f;border-radius:8px;padding:12px;text-align:center">
            <div style="color:#52525b;font-size:11px;margin-bottom:4px">Entry Plan</div>
            <div style="color:#10b981;font-size:14px;font-weight:500">Rp ${item.entry_price.toLocaleString("id-ID")}</div>
          </td>
          ${item.tp_price ? `<td style="background:#0a0a0f;border-radius:8px;padding:12px;text-align:center">
            <div style="color:#52525b;font-size:11px;margin-bottom:4px">Take Profit</div>
            <div style="color:#10b981;font-size:14px;font-weight:500">Rp ${item.tp_price.toLocaleString("id-ID")}</div>
          </td>` : ""}
          ${item.sl_price ? `<td style="background:#0a0a0f;border-radius:8px;padding:12px;text-align:center">
            <div style="color:#52525b;font-size:11px;margin-bottom:4px">Stop Loss</div>
            <div style="color:#ef4444;font-size:14px;font-weight:500">Rp ${item.sl_price.toLocaleString("id-ID")}</div>
          </td>` : ""}
        </tr>
      </table>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/watchlist"
        style="display:block;background:#10b981;color:#0a0a0f;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;margin-top:20px">
        Lihat Watchlist →
      </a>
    </div>
    <p style="color:#374151;font-size:11px;text-align:center;margin-top:16px">TradeLog · tradelog.co.id</p>
  </div>
</body>
</html>`,
  });
}