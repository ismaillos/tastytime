import type { Metadata } from 'next'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata: Metadata = { title: 'Tasty Time — Dashboard' }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <DashboardShell>{children}</DashboardShell>
    </QueryProvider>
  )
}
