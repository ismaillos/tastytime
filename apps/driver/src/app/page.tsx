'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, MapPin, Package, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

interface AssignedOrder {
  id: string
  customerName: string
  customerPhone: string
  address: string | null
  total: string
  items: Array<{ productName: string; quantity: number }>
}

export default function DriverApp() {
  const [isOnline, setIsOnline] = useState(false)
  const [assignedOrder, setAssignedOrder] = useState<AssignedOrder | null>(null)
  const [isDelivering, setIsDelivering] = useState(false)

  // Geolocation tracking — sends coords every 30s when online
  const sendLocation = useCallback(() => {
    if (!isOnline) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await fetch(`${API}/api/driver/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        credentials: 'include',
      })
    })
  }, [isOnline])

  useEffect(() => {
    if (!isOnline) return
    sendLocation()
    const interval = setInterval(sendLocation, 30000)
    return () => clearInterval(interval)
  }, [isOnline, sendLocation])

  async function toggleOnline() {
    const next = !isOnline
    await fetch(`${API}/api/driver/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
      body: JSON.stringify({ isOnline: next }),
      credentials: 'include',
    })
    setIsOnline(next)
  }

  async function markDelivered() {
    if (!assignedOrder) return
    setIsDelivering(true)
    await fetch(`${API}/api/orders/${assignedOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
      body: JSON.stringify({ status: 'delivered' }),
      credentials: 'include',
    })
    setAssignedOrder(null)
    setIsDelivering(false)
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-yellow-400">Tasty Time</h1>
          <p className="text-neutral-500 text-sm">Driver App</p>
        </div>

        {/* Online toggle */}
        <motion.button
          onClick={toggleOnline}
          whileTap={{ scale: 0.95 }}
          className={`w-full rounded-2xl py-6 flex flex-col items-center gap-3 font-bold text-lg transition-colors ${
            isOnline
              ? 'bg-green-500 text-white'
              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
          }`}
        >
          {isOnline ? <Wifi className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
          {isOnline ? 'En ligne — Prêt pour livraisons' : 'Hors ligne'}
        </motion.button>

        {/* Assigned order */}
        {assignedOrder ? (
          <div className="mt-6 rounded-2xl bg-neutral-900 border border-yellow-400/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-yellow-400" />
              <span className="font-bold text-yellow-400">Commande assignée</span>
            </div>

            <div className="space-y-2 mb-4">
              <p className="font-semibold text-white">{assignedOrder.customerName}</p>
              {assignedOrder.address && (
                <div className="flex items-start gap-2 text-sm text-neutral-400">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{assignedOrder.address}</span>
                </div>
              )}
              <p className="text-sm text-neutral-400">📞 {assignedOrder.customerPhone}</p>
            </div>

            <div className="space-y-1 mb-4 border-t border-neutral-800 pt-3">
              {assignedOrder.items.map((item, i) => (
                <p key={i} className="text-sm text-neutral-300">
                  {item.quantity}× {item.productName}
                </p>
              ))}
            </div>

            <p className="text-yellow-400 font-bold mb-4">
              Total: {Number(assignedOrder.total).toFixed(0)} MAD
            </p>

            <button
              onClick={markDelivered}
              disabled={isDelivering}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-bold text-white hover:bg-green-400 disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5" />
              Marquer comme livré
            </button>
          </div>
        ) : (
          isOnline && (
            <div className="mt-6 rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center text-neutral-500">
              <p className="text-2xl mb-2">🛵</p>
              <p>En attente d'une commande...</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
