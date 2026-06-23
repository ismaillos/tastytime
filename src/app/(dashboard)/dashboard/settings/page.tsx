'use client'
import { useState, useEffect } from 'react'
import { Save, Globe, Phone, MapPin, DollarSign } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

interface TenantSettings {
  id: string
  slug: string
  name: string
  address: string | null
  phone: string | null
  logoUrl: string | null
  currency: string
  defaultLocale: string
  isActive: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/onboarding/tenants`, {
      headers: { 'X-Tenant-Slug': TENANT },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        const tenant = (data.data as TenantSettings[]).find((t) => t.slug === TENANT)
        if (tenant) setSettings(tenant)
      })
      .catch(() => null)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      await fetch(`${API}/api/onboarding/tenants/${settings.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({
          name: settings.name,
          address: settings.address,
          phone: settings.phone,
          logoUrl: settings.logoUrl,
          currency: settings.currency,
          defaultLocale: settings.defaultLocale,
        }),
        credentials: 'include',
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6">
        <div className="space-y-4 max-w-xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">Paramètres du restaurant</h1>

      <form onSubmit={handleSave} className="max-w-xl space-y-5">
        {/* Restaurant info */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
          <h2 className="font-bold text-white text-sm uppercase tracking-wider text-neutral-400">Informations générales</h2>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Nom du restaurant</label>
            <input
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Adresse
            </label>
            <input
              value={settings.address ?? ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
              placeholder="Avenue des Saveurs, Casablanca"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Téléphone
            </label>
            <input
              value={settings.phone ?? ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
              placeholder="+212 6XX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">URL du logo</label>
            <input
              value={settings.logoUrl ?? ''}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Locale & currency */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Localisation</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Langue par défaut
              </label>
              <select
                value={settings.defaultLocale}
                onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Devise
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="MAD">MAD — Dirham marocain</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dollar américain</option>
              </select>
            </div>
          </div>
        </div>

        {/* Read-only info */}
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
          <h2 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Informations système</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-500 text-xs">Slug</p>
              <p className="font-mono text-neutral-300">{settings.slug}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">ID</p>
              <p className="font-mono text-neutral-300 text-xs truncate">{settings.id}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs">Statut</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${settings.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {settings.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : saved ? '✅ Enregistré !' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
