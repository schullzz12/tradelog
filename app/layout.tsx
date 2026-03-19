import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TradeLog — Trading Journal untuk Trader Saham Indonesia',
  description: 'Log trade dalam 5 detik. Analisis performa, track emosi, dan improve strategi trading kamu.',
  keywords: ['trading journal', 'saham indonesia', 'stockbit', 'ajaib', 'portfolio tracker'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  )
}
