import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Hoff Labs - For People Who Hate Looking at Their Finances',
  description: 'Track your spending, roast your habits, and maybe get out of debt (eventually)',
  icons: {
    icon: '/hofflabs.png',
    apple: '/hofflabs.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>{children}</body>
    </html>
  )
}
