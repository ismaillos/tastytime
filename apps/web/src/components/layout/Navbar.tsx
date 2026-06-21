'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Star, User, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function Navbar() {
  const t = useTranslations('nav')
  const params = useParams()
  const locale = params.locale as string
  const { user, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href={`/${locale}/menu`} className="flex items-center gap-1">
          <span className="text-xl font-black text-yellow-400">Tasty</span>
          <span className="text-xl font-black text-white">Time</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/menu`}
            className="hidden sm:block text-sm text-neutral-300 hover:text-white transition-colors"
          >
            {t('menu')}
          </Link>

          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-xl bg-neutral-800" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-700 transition-colors"
              >
                <User className="h-4 w-4 text-neutral-400" />
                <span className="text-white font-medium max-w-24 truncate">{user.name}</span>
                {user.loyaltyPoints > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {user.loyaltyPoints}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-neutral-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden z-50">
                  <Link
                    href={`/${locale}/profile`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    <User className="h-4 w-4" /> {t('profile')}
                  </Link>
                  <Link
                    href={`/${locale}/orders`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    <span className="h-4 w-4 flex items-center justify-center text-xs">📦</span>
                    {t('orders')}
                  </Link>
                  <hr className="border-neutral-800" />
                  <button
                    onClick={() => { setMenuOpen(false); signOut() }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-neutral-800"
                  >
                    <LogOut className="h-4 w-4" /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/auth/login`}
              className="rounded-xl bg-yellow-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
