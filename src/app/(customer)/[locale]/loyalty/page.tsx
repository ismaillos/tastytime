'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Star, Gift, ArrowLeft } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

interface LoyaltyData {
  points: number
  tier: string
  transactions: Array<{
    id: string
    type: string
    points: number
    description: string
    createdAt: string
  }>
}

const TIER_THRESHOLDS = [
  { name: 'Bronze', min: 0, max: 500, color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/30' },
  { name: 'Silver', min: 500, max: 1500, color: 'text-slate-300', bg: 'bg-slate-300/10 border-slate-300/30' },
  { name: 'Gold', min: 1500, max: 3000, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  { name: 'Platinum', min: 3000, max: Infinity, color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/30' },
]

function getTier(points: number) {
  const matches = TIER_THRESHOLDS.filter((t) => points >= t.min)
  return matches[matches.length - 1] ?? TIER_THRESHOLDS[0]
}

export default function LoyaltyPage() {
  const params = useParams()
  const locale = params.locale as string

  const { data, isLoading } = useQuery<LoyaltyData>({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/loyalty`, {
        headers: { 'X-Tenant-Slug': TENANT },
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Unauthorized')
      return (await res.json()).data
    },
  })

  const tier = data ? getTier(data.points) : TIER_THRESHOLDS[0]
  const nextTier = TIER_THRESHOLDS[TIER_THRESHOLDS.findIndex((t) => t.name === tier.name) + 1]
  const progress = data && nextTier
    ? Math.min(100, ((data.points - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/${locale}/menu`}
          className="mb-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au menu
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-white">Mon programme fidélité</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-800" />
            ))}
          </div>
        ) : !data ? (
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center">
            <Star className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">Connectez-vous pour voir vos points</p>
            <Link
              href={`/${locale}/auth/login`}
              className="mt-4 inline-block rounded-xl bg-yellow-400 px-6 py-2 text-sm font-bold text-black hover:bg-yellow-300"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Points card */}
            <div className={`rounded-2xl border p-6 ${tier.bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-neutral-400">Votre solde</p>
                  <p className={`text-4xl font-black ${tier.color}`}>{data.points.toLocaleString()}</p>
                  <p className="text-sm text-neutral-400">points</p>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 border ${tier.bg} ${tier.color} font-bold`}>
                    <Star className="h-4 w-4 fill-current" />
                    {tier.name}
                  </div>
                </div>
              </div>

              {nextTier && (
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 mb-1">
                    <span>{tier.name}</span>
                    <span>{nextTier.name} — encore {(nextTier.min - data.points).toLocaleString()} pts</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${tier.color.replace('text-', 'bg-')}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Rewards */}
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="h-5 w-5 text-yellow-400" />
                <h2 className="font-bold text-white">Comment gagner des points</h2>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Chaque commande', value: '1 pt / MAD dépensé' },
                  { label: 'Anniversaire', value: '200 pts offerts' },
                  { label: 'Parrainage', value: '100 pts par ami' },
                  { label: 'Avis Google', value: '50 pts' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-neutral-400">{label}</span>
                    <span className="font-semibold text-yellow-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history */}
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-800">
                <h2 className="font-bold text-white">Historique</h2>
              </div>
              {data.transactions.length === 0 ? (
                <div className="py-8 text-center text-neutral-600 text-sm">Aucune transaction</div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {data.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm text-white">{tx.description}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(tx.createdAt).toLocaleDateString('fr-MA')}
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
