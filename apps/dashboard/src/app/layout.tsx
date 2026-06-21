import type { Metadata } from 'next'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata: Metadata = { title: 'Tasty Time — Dashboard' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-neutral-950 text-white">
        <QueryProvider>
          <DashboardShell>{children}</DashboardShell>
        </QueryProvider>
      </body>
    </html>
  )
}
