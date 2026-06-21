'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChefHat, UtensilsCrossed, BarChart2, Settings, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/kitchen', label: 'Cuisine (KDS)', icon: ChefHat },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/orders', label: 'Commandes', icon: Truck },
  { href: '/reports', label: 'Rapports', icon: BarChart2 },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800">
          <span className="text-lg font-black text-yellow-400">Tasty</span>
          <span className="text-lg font-black text-white">Time</span>
          <span className="ml-auto rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">Staff</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-neutral-800">
          <div className="rounded-xl bg-neutral-800 px-3 py-2.5">
            <p className="text-xs font-medium text-white">Tasty Time</p>
            <p className="text-xs text-neutral-500">Casablanca, Maroc</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
