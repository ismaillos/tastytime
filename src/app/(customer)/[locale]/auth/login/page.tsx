'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema, type SignInInput } from '@tastytime/validators'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

export default function LoginPage() {
  const t = useTranslations('auth')
  const params = useParams()
  const locale = params.locale as string
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(data: SignInInput) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur de connexion')
      router.push(`/${locale}/menu`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}/menu`} className="inline-flex flex-col items-center">
            <span className="text-3xl font-black text-yellow-400">Tasty</span>
            <span className="text-3xl font-black text-white -mt-1">Time</span>
          </Link>
          <p className="mt-2 text-neutral-500 text-sm">Good Food · Good Mood · Great Time</p>
        </div>

        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
          <h1 className="text-xl font-bold text-white mb-6">{t('signIn')}</h1>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none text-sm"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-300">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-10 pr-10 py-2.5 text-white placeholder-neutral-500 focus:border-yellow-400 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href={`/${locale}/auth/forgot-password`} className="text-xs text-yellow-400 hover:text-yellow-300">
                {t('forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion...' : t('signIn')}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-xs text-neutral-600">ou</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => window.location.href = `${API}/api/auth/sign-in/google`}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('continueWithGoogle')}
          </button>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/auth/register`} className="text-yellow-400 hover:text-yellow-300 font-medium">
              {t('signUp')}
            </Link>
          </p>

          <div className="mt-3 border-t border-neutral-800 pt-4 text-center">
            <Link href={`/${locale}/checkout`} className="text-xs text-neutral-500 hover:text-neutral-400">
              {t('guestCheckout')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
