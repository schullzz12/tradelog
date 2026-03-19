import "./globals.css";

export const metadata = {
  title: "TradeLog — Trading Journal untuk Trader Indonesia",
  description:
    "Catat, analisis, dan tingkatkan performa trading saham kamu dengan TradeLog. Dashboard lengkap dengan P&L tracking, equity curve, dan analisis emosi.",
  keywords: ["trading journal", "saham indonesia", "trading log", "portfolio tracker", "IDX"],
  authors: [{ name: "TradeLog" }],
  openGraph: {
    title: "TradeLog — Trading Journal untuk Trader Indonesia",
    description: "Catat, analisis, dan tingkatkan performa trading saham kamu.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeLog — Trading Journal untuk Trader Indonesia",
    description: "Catat, analisis, dan tingkatkan performa trading saham kamu.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[#0a0a0f] antialiased">{children}</body>
    </html>
  );
}
