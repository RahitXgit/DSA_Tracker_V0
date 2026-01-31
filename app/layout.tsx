import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/Providers'
import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DSA Tracker - Track Your Progress',
  description: 'Plan, track, and master Data Structures and Algorithms. Never miss a beat!',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#FF6B35" />
      </head>
      <body>
        <Providers>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
