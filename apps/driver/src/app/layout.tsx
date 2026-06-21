import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tasty Time — Driver',
  manifest: '/manifest.json',
  themeColor: '#facc15',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-neutral-950 text-white">{children}</body>
    </html>
  )
}
