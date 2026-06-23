'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '@tastytime/ui'
import type { OrderStatus } from '@tastytime/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'received', label: 'Reçues' },
  { value: 'preparing', label: 'En préparation' },
  { value: 'ready', label: 'Prêtes' },
  { value: 'out_for_delivery', label: 'En livraison' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
]

interface Order {
  id: string
  customerName: string
  customerPhone: string
  type: string
  status: string
  total: string
  items: Array<{ productName: string; quantity: number }>
  createdAt: string
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders', statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `${API}/api/orders?status=${statusFilter}`
        : `${API}/api/orders`
      const res = await fetch(url, { headers: { 'X-Tenant-Slug': TENANT }, credentials: 'include' })
      return (await res.json()).data ?? []
    },
    refetchInterval: 15000,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`${API}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ status }),
        credentials: 'include',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">Commandes</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-yellow-400 text-black'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {isLoading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-neutral-800" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-neutral-600">
            <p className="text-3xl mb-3">📋</p>
            <p>Aucune commande</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {orders.map((order) => (
              <div key={order.id}>
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                >
                  <div className="w-24">
                    <p className="font-mono text-xs text-neutral-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-neutral-600">
                      {new Date(order.createdAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{order.customerName}</p>
                    <p className="text-xs text-neutral-500">{order.customerPhone}</p>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400">
                    {order.type === 'delivery' ? '🛵' : order.type === 'pickup' ? '🏃' : '🪑'} {order.type}
                  </span>

                  <StatusBadge status={order.status as OrderStatus} />

                  <span className="font-semibold text-yellow-400 whitespace-nowrap">
                    {Number(order.total).toFixed(0)} MAD
                  </span>
                </div>

                {expanded === order.id && (
                  <div className="px-5 pb-4 bg-neutral-800/30 border-t border-neutral-800">
                    <div className="mt-3 space-y-1 mb-3">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-sm text-neutral-300">
                          {item.quantity}× {item.productName}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'received' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'accepted' })}
                          className="rounded-xl bg-green-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-400"
                        >
                          Accepter
                        </button>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'preparing' })}
                          className="rounded-xl bg-yellow-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-yellow-300"
                        >
                          En préparation
                        </button>
                      )}
                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                          className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/30"
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
