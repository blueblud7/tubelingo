import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/ui/BottomNav'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TubeLingo',
  description: 'Learn languages from your favorite YouTube channels',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 antialiased`}>
        <main className="mx-auto min-h-screen max-w-md pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
