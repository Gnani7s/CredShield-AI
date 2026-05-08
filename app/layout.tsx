import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'CredShield AI — Credit Abuse Detection',
  description: 'AI-powered multi-account credit abuse detection. One user. One identity. Zero credit abuse.',
  keywords: ['fraud detection', 'credit abuse', 'ai security', 'device fingerprinting'],
  authors: [{ name: 'CredShield AI' }],
  robots: 'noindex,nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07090f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#07090f] text-white font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#111520', color: '#e8ecf4', border: '1px solid #1e2535', fontSize: '13px' },
            success: { iconTheme: { primary: '#00e676', secondary: '#07090f' } },
            error: { iconTheme: { primary: '#ff4757', secondary: '#07090f' } },
          }}
        />
      </body>
    </html>
  )
}
