import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tasty Time — Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-neutral-950 text-white">{children}</body>
    </html>
  )
}
