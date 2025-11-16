import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import { Suspense } from "react"

export default function VocabLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      {children}
    </Suspense>
  )
}

export const metadata: Metadata = {
  title: 'Mekuru Reading Companion',
  description: 'Every word carries the memory of where you met it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <Header />
        {children}
      </body>
    </html>
  )
}
