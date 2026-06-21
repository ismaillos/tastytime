'use client'
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Check, X, Printer } from 'lucide-react'
import { StatusBadge } from '@tastytime/ui'
import type { OrderStatus } from '@tastytime/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

async function fetchOrders(status?: string) {
  const url = status ? `${API}/api/orders?status=${status}` : `${API}/api/orders`
  const res = await fetch(url, { headers: { 'X-Tenant-Slug': TENANT } })
  const data = await res.json()
  return data.data
}

async function updateStatus(orderId: string, status: string) {
  const res = await fetch(`${API}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
    body: JSON.stringify({ status }),
  })
  return res.json()
}

interface Order {
  id: string
  customerName: string
  customerPhone: string
  type: string
  status: string
  items: Array<{ productName: string; quantity: number; customizations: Array<{ optionName: string }> }>
  total: string
  estimatedPrepMinutes: number
  notes: string | null
  createdAt: string
}

const ACTIVE_STATUSES = ['received', 'accepted', 'preparing', 'ready']

export default function KitchenPage() {
  const queryClient = useQueryClient()

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['kitchen-orders'],
    queryFn: () => fetchOrders(),
    refetchInterval: 15000,
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  })

  // Real-time new orders
  useEffect(() => {
    const socket = io(API, { transports: ['websocket'] })
    socket.emit('kitchen:join', TENANT)

    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    })
    socket.on('order:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    })

    return () => { socket.disconnect() }
  }, [queryClient])

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">Kitchen Display</h1>
        <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-semibold text-white">
          {activeOrders.length} actives
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {activeOrders.map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm text-neutral-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="font-bold text-white">{order.customerName}</p>
                  <p className="text-xs text-neutral-400">{order.type === 'delivery' ? '🛵 Livraison' : order.type === 'pickup' ? '🏃 À emporter' : '🪑 Sur place'}</p>
                </div>
                <StatusBadge status={order.status as OrderStatus} />
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-semibold text-white">{item.quantity}× {item.productName}</span>
                    {item.customizations.length > 0 && (
                      <p className="text-xs text-neutral-400 ml-4">
                        {item.customizations.map((c) => c.optionName).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mb-3 rounded-lg bg-yellow-400/10 border border-yellow-400/30 p-2 text-xs text-yellow-300">
                  📝 {order.notes}
                </div>
              )}

              {/* Timer */}
              <div className="flex items-center gap-1 text-xs text-neutral-500 mb-4">
                <Clock className="h-3 w-3" />
                <span>{new Date(order.createdAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {order.status === 'received' && (
                  <>
                    <button
                      onClick={() => mutation.mutate({ id: order.id, status: 'accepted' })}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-400"
                    >
                      <Check className="h-4 w-4" /> Accepter
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: order.id, status: 'cancelled' })}
                      className="flex items-center justify-center gap-1 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button
                    onClick={() => mutation.mutate({ id: order.id, status: 'preparing' })}
                    className="flex-1 rounded-xl bg-yellow-400 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
                  >
                    En préparation
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => mutation.mutate({ id: order.id, status: 'ready' })}
                    className="flex-1 rounded-xl bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-400"
                  >
                    ✅ Prête
                  </button>
                )}
                {order.status === 'ready' && order.type === 'delivery' && (
                  <button
                    onClick={() => mutation.mutate({ id: order.id, status: 'out_for_delivery' })}
                    className="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-400"
                  >
                    🛵 Envoyer
                  </button>
                )}
                {order.status === 'ready' && order.type !== 'delivery' && (
                  <button
                    onClick={() => mutation.mutate({ id: order.id, status: 'delivered' })}
                    className="flex-1 rounded-xl bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-400"
                  >
                    ✅ Terminé
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center rounded-xl bg-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-700"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeOrders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center h-48 text-neutral-600">
            <p className="text-2xl">🍳</p>
            <p className="mt-2">Aucune commande active</p>
          </div>
        )}
      </div>
    </div>
  )
}
