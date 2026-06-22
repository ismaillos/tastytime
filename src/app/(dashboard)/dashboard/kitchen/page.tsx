'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Check, X, Printer, AlertTriangle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'
const ALERT_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

async function fetchOrders() {
  const res = await fetch(`${API}/api/orders`, {
    headers: { 'X-Tenant-Slug': TENANT },
    credentials: 'include',
  })
  return (await res.json()).data ?? []
}

interface Order {
  id: string
  customerName: string
  customerPhone: string
  type: string
  status: string
  items: Array<{
    productName: string
    quantity: number
    customizations: Array<{ optionName: string }>
  }>
  total: string
  estimatedPrepMinutes: number
  notes: string | null
  createdAt: string
}

const ACTIVE_STATUSES = ['received', 'accepted', 'preparing', 'ready']

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [createdAt])

  const mins = Math.floor(elapsed / 60000)
  const secs = Math.floor((elapsed % 60000) / 1000)
  const isOverdue = elapsed > ALERT_THRESHOLD_MS

  return (
    <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400 font-semibold animate-pulse' : 'text-neutral-500'}`}>
      {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      <span>{mins}:{secs.toString().padStart(2, '0')}</span>
      {isOverdue && <span className="ml-1">⚠ En retard</span>}
    </div>
  )
}

function printTicket(order: Order) {
  const win = window.open('', '_blank', 'width=300,height=600')
  if (!win) return
  const items = order.items
    .map(
      (it) =>
        `<tr><td>${it.quantity}×</td><td>${it.productName}</td></tr>` +
        (it.customizations.length
          ? `<tr><td></td><td style="color:#666;font-size:11px">${it.customizations.map((c) => c.optionName).join(', ')}</td></tr>`
          : ''),
    )
    .join('')
  win.document.write(`
    <html><head><title>Ticket</title>
    <style>
      body{font-family:monospace;font-size:13px;padding:8px;width:280px}
      h2{text-align:center;font-size:16px;margin:0 0 4px}
      p{margin:2px 0;font-size:12px}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      td{padding:2px 4px;vertical-align:top}
      .total{font-size:15px;font-weight:bold;text-align:right;border-top:1px dashed #000;padding-top:4px}
      .footer{text-align:center;font-size:11px;margin-top:8px;color:#666}
    </style></head>
    <body onload="window.print();window.close()">
      <h2>TASTY TIME</h2>
      <p style="text-align:center">Casablanca, Maroc</p>
      <hr style="border-top:1px dashed #000"/>
      <p>#${order.id.slice(0, 8).toUpperCase()}</p>
      <p>${new Date(order.createdAt).toLocaleString('fr-MA')}</p>
      <p>${order.type === 'delivery' ? '🛵 Livraison' : order.type === 'pickup' ? '🏃 À emporter' : '🪑 Sur place'}</p>
      <p><b>${order.customerName}</b> — ${order.customerPhone}</p>
      ${order.notes ? `<p style="background:#fffde7;padding:4px"><b>Note:</b> ${order.notes}</p>` : ''}
      <table>${items}</table>
      <p class="total">Total: ${Number(order.total).toFixed(2)} MAD</p>
      <p class="footer">Merci de votre confiance !</p>
    </body></html>
  `)
  win.document.close()
}

export default function KitchenPage() {
  const queryClient = useQueryClient()
  const audioRef = useRef<AudioContext | null>(null)

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['kitchen-orders'],
    queryFn: fetchOrders,
    refetchInterval: 15000,
  })

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await fetch(`${API}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ status }),
        credentials: 'include',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  })

  function playAlert() {
    try {
      const ctx = audioRef.current ?? (audioRef.current = new AudioContext())
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch {
      // AudioContext not available (SSR / test env)
    }
  }

  useEffect(() => {
    const socket = io(API, { transports: ['websocket'] })
    socket.emit('kitchen:join', TENANT)

    socket.on('order:new', () => {
      playAlert()
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    })
    socket.on('order:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    })

    return () => { socket.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient])

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))

  const columnsByStatus: Record<string, Order[]> = {
    received: [],
    accepted: [],
    preparing: [],
    ready: [],
  }
  for (const o of activeOrders) {
    if (columnsByStatus[o.status]) columnsByStatus[o.status].push(o)
  }

  const COLUMNS = [
    { key: 'received', label: 'Nouvelles', color: 'text-blue-400', border: 'border-blue-500/30' },
    { key: 'accepted', label: 'Acceptées', color: 'text-yellow-400', border: 'border-yellow-500/30' },
    { key: 'preparing', label: 'En préparation', color: 'text-orange-400', border: 'border-orange-500/30' },
    { key: 'ready', label: 'Prêtes', color: 'text-green-400', border: 'border-green-500/30' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950 p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">Kitchen Display</h1>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-sm font-semibold text-green-400">
            {activeOrders.length} actives
          </span>
          <span className="text-xs text-neutral-600">
            {new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 h-[calc(100vh-100px)]">
        {COLUMNS.map(({ key, label, color, border }) => (
          <div key={key} className={`flex flex-col rounded-2xl border ${border} bg-neutral-900/50 overflow-hidden`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b border-neutral-800`}>
              <span className={`text-sm font-bold ${color}`}>{label}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 bg-neutral-800 ${color}`}>
                {columnsByStatus[key].length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <AnimatePresence>
                {columnsByStatus[key].map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-xl bg-neutral-900 border border-neutral-800 p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-xs text-neutral-500">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="font-bold text-white text-sm">{order.customerName}</p>
                        <p className="text-xs text-neutral-400">
                          {order.type === 'delivery' ? '🛵' : order.type === 'pickup' ? '🏃' : '🪑'} {order.type}
                        </p>
                      </div>
                      <ElapsedTimer createdAt={order.createdAt} />
                    </div>

                    <div className="space-y-0.5 mb-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-semibold text-white">{item.quantity}× {item.productName}</span>
                          {item.customizations.length > 0 && (
                            <p className="text-neutral-500 ml-3">
                              {item.customizations.map((c) => c.optionName).join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="mb-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20 p-1.5 text-xs text-yellow-300">
                        📝 {order.notes}
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-2">
                      {order.status === 'received' && (
                        <>
                          <button
                            onClick={() => mutation.mutate({ id: order.id, status: 'accepted' })}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-400"
                          >
                            <Check className="h-3 w-3" /> Oui
                          </button>
                          <button
                            onClick={() => mutation.mutate({ id: order.id, status: 'cancelled' })}
                            className="flex items-center justify-center rounded-lg bg-red-500/20 border border-red-500/30 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/30"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => mutation.mutate({ id: order.id, status: 'preparing' })}
                          className="flex-1 rounded-lg bg-yellow-400 py-1.5 text-xs font-bold text-black hover:bg-yellow-300"
                        >
                          Préparer
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => mutation.mutate({ id: order.id, status: 'ready' })}
                          className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-400"
                        >
                          ✅ Prête
                        </button>
                      )}
                      {order.status === 'ready' && order.type === 'delivery' && (
                        <button
                          onClick={() => mutation.mutate({ id: order.id, status: 'out_for_delivery' })}
                          className="flex-1 rounded-lg bg-blue-500 py-1.5 text-xs font-bold text-white hover:bg-blue-400"
                        >
                          🛵 Envoyer
                        </button>
                      )}
                      {order.status === 'ready' && order.type !== 'delivery' && (
                        <button
                          onClick={() => mutation.mutate({ id: order.id, status: 'delivered' })}
                          className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-400"
                        >
                          ✅ Terminé
                        </button>
                      )}
                      <button
                        onClick={() => printTicket(order)}
                        className="flex items-center justify-center rounded-lg bg-neutral-800 px-2 py-1.5 text-neutral-400 hover:bg-neutral-700"
                        title="Imprimer le ticket"
                      >
                        <Printer className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {columnsByStatus[key].length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 text-neutral-700 text-xs">
                  <p>Vide</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
