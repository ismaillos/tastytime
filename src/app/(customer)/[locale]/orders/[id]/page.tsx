'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { io } from 'socket.io-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { CheckCircle, Clock, ChefHat, Package, Bike, PartyPopper, XCircle } from 'lucide-react'
import type { OrderStatus } from '@tastytime/types'
import { cn } from '@/lib/utils'

const STEPS: Array<{ status: OrderStatus; icon: React.ElementType; labelKey: string }> = [
  { status: 'received', icon: Clock, labelKey: 'received' },
  { status: 'accepted', icon: CheckCircle, labelKey: 'accepted' },
  { status: 'preparing', icon: ChefHat, labelKey: 'preparing' },
  { status: 'ready', icon: Package, labelKey: 'ready' },
  { status: 'out_for_delivery', icon: Bike, labelKey: 'out_for_delivery' },
  { status: 'delivered', icon: PartyPopper, labelKey: 'delivered' },
]

interface Order {
  id: string
  status: string
  customerName: string
  total: string
  estimatedPrepMinutes: number
  type: string
}

export default function OrderTrackingPage() {
  const t = useTranslations('order')
  const params = useParams()
  const orderId = params.id as string
  const queryClient = useQueryClient()

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.get(orderId) as Promise<Order>,
    refetchInterval: 30000,
  })

  // Subscribe to real-time updates
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? '', {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit('order:track', orderId)
    })

    socket.on('order:status_changed', ({ orderId: id, status }) => {
      if (id === orderId) {
        queryClient.setQueryData(['order', orderId], (prev: Order | undefined) =>
          prev ? { ...prev, status } : prev,
        )
      }
    })

    return () => { socket.disconnect() }
  }, [orderId, queryClient])

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    )
  }

  const currentStatus = order.status as OrderStatus
  const isCancelled = currentStatus === 'cancelled'
  const currentIdx = STEPS.findIndex((s) => s.status === currentStatus)

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-2xl font-bold text-yellow-400">
          {t('orderNumber', { id: order.id.slice(0, 8).toUpperCase() })}
        </h1>
        <p className="text-neutral-400">
          {t('estimatedTime', { minutes: order.estimatedPrepMinutes })}
        </p>

        {isCancelled ? (
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
            <XCircle className="h-8 w-8 text-red-400" />
            <p className="text-red-400 font-semibold">{t('cancelled')}</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isPast = idx < currentIdx
              const isCurrent = idx === currentIdx
              return (
                <div
                  key={step.status}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl p-4 transition-all',
                    isCurrent && 'bg-yellow-400/10 border border-yellow-400/30',
                    isPast && 'opacity-50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full',
                      isCurrent ? 'bg-yellow-400 text-black' : isPast ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-500',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn('font-semibold', isCurrent ? 'text-yellow-400' : isPast ? 'text-green-400' : 'text-neutral-500')}>
                      {t(step.labelKey as Parameters<typeof t>[0])}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-neutral-400 mt-0.5">En cours...</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
          <div className="flex justify-between">
            <span className="text-neutral-400">Total</span>
            <span className="font-bold text-yellow-400">{Number(order.total).toFixed(0)} MAD</span>
          </div>
        </div>
      </div>
    </div>
  )
}
