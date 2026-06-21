'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, MapPin, Package, CheckCircle, Camera, X } from 'lucide-react'

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
  const [proofPhoto, setProofPhoto] = useState<string | null>(null)
  const [isDelivering, setIsDelivering] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Socket.IO — listen for assigned orders
  useEffect(() => {
    const socket = io(API, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('driver:order_assigned', (order: AssignedOrder) => {
      setAssignedOrder(order)
      showToast('Nouvelle commande assignée !')
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
    })

    return () => { socket.disconnect() }
  }, [])

  // GPS tracking — every 30s while online
  const sendLocation = useCallback(() => {
    if (!isOnline) return
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      await fetch(`${API}/api/driver/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        credentials: 'include',
      }).catch(() => null)
    })
  }, [isOnline])

  useEffect(() => {
    if (!isOnline) return
    sendLocation()
    const id = setInterval(sendLocation, 30000)
    return () => clearInterval(id)
  }, [isOnline, sendLocation])

  async function toggleOnline() {
    const next = !isOnline
    try {
      await fetch(`${API}/api/driver/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ isOnline: next }),
        credentials: 'include',
      })
      setIsOnline(next)
      if (next) showToast('Vous êtes en ligne')
    } catch {
      showToast('Erreur de connexion')
    }
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProofPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function markDelivered() {
    if (!assignedOrder) return
    setIsDelivering(true)
    try {
      const body: Record<string, string> = { status: 'delivered' }
      if (proofPhoto) body.proofPhoto = proofPhoto

      await fetch(`${API}/api/orders/${assignedOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify(body),
        credentials: 'include',
      })
      showToast('Livraison confirmée ✅')
      setAssignedOrder(null)
      setProofPhoto(null)
    } catch {
      showToast('Erreur lors de la confirmation')
    } finally {
      setIsDelivering(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="mx-auto max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-yellow-400">Tasty<span className="text-white">Time</span></h1>
          <p className="text-neutral-500 text-sm">Driver</p>
        </div>

        {/* Online toggle */}
        <motion.button
          onClick={toggleOnline}
          whileTap={{ scale: 0.96 }}
          className={`w-full rounded-2xl py-6 flex flex-col items-center gap-3 font-bold text-lg transition-colors ${
            isOnline
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
          }`}
        >
          {isOnline ? <Wifi className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
          {isOnline ? 'En ligne — Prêt' : 'Hors ligne'}
        </motion.button>

        {/* Assigned order */}
        <AnimatePresence>
          {assignedOrder ? (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 rounded-2xl bg-neutral-900 border border-yellow-400/30 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-yellow-400" />
                <span className="font-bold text-yellow-400">Commande assignée</span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="font-semibold text-white text-lg">{assignedOrder.customerName}</p>
                <p className="text-sm text-neutral-400">📞 {assignedOrder.customerPhone}</p>
                {assignedOrder.address && (
                  <div className="flex items-start gap-2 text-sm text-neutral-300 bg-neutral-800 rounded-xl p-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-yellow-400" />
                    <span>{assignedOrder.address}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 mb-4 border-t border-neutral-800 pt-3">
                {assignedOrder.items.map((item, i) => (
                  <p key={i} className="text-sm text-neutral-300">
                    {item.quantity}× {item.productName}
                  </p>
                ))}
              </div>

              <p className="text-yellow-400 font-bold text-xl mb-5">
                {Number(assignedOrder.total).toFixed(0)} MAD
              </p>

              {/* Proof of delivery photo */}
              <div className="mb-4">
                <p className="text-xs text-neutral-500 mb-2">Preuve de livraison (optionnel)</p>
                {proofPhoto ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proofPhoto} alt="Proof" className="w-full rounded-xl object-cover max-h-40" />
                    <button
                      onClick={() => setProofPhoto(null)}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 py-4 text-sm text-neutral-500 hover:border-neutral-500 hover:text-neutral-400 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    Prendre une photo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
              </div>

              <button
                onClick={markDelivered}
                disabled={isDelivering}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-bold text-white hover:bg-green-400 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                {isDelivering ? 'Confirmation...' : 'Confirmer la livraison'}
              </button>
            </motion.div>
          ) : (
            isOnline && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 rounded-2xl bg-neutral-900 border border-neutral-800 p-8 text-center"
              >
                <div className="text-4xl mb-3">🛵</div>
                <p className="text-neutral-400 font-medium">En attente d'une commande...</p>
                <div className="mt-3 flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-neutral-600"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                    />
                  ))}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-2xl bg-neutral-800 border border-neutral-700 px-5 py-3 text-sm font-medium text-white shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
