import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tasty Time — Good Food, Good Mood, Great Time!',
  description: 'Burgers, Tacos, Poutines, Brunch & more. Casablanca, Maroc.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="bg-neutral-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
