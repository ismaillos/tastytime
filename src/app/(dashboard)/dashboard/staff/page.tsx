'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'text-yellow-400 bg-yellow-400/10' },
  { value: 'kitchen', label: 'Cuisine', color: 'text-orange-400 bg-orange-400/10' },
  { value: 'cashier', label: 'Caissier', color: 'text-blue-400 bg-blue-400/10' },
  { value: 'driver', label: 'Livreur', color: 'text-green-400 bg-green-400/10' },
]

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('kitchen')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/staff`, {
        headers: { 'X-Tenant-Slug': TENANT },
        credentials: 'include',
      })
      return (await res.json()).data ?? []
    },
  })

  const invite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch(`${API}/api/staff/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ email, role }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur lors de l\'invitation')
    },
    onSuccess: () => {
      setInviteEmail('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await fetch(`${API}/api/staff/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
        body: JSON.stringify({ role }),
        credentials: 'include',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API}/api/staff/${id}`, {
        method: 'DELETE',
        headers: { 'X-Tenant-Slug': TENANT },
        credentials: 'include',
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  })

  function roleStyle(role: string) {
    return ROLES.find((r) => r.value === role)?.color ?? 'text-neutral-400 bg-neutral-800'
  }

  function roleLabel(role: string) {
    return ROLES.find((r) => r.value === role)?.label ?? role
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <h1 className="mb-6 text-2xl font-bold text-yellow-400">Gestion du personnel</h1>

      {/* Invite form */}
      <div className="mb-6 rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-yellow-400" />
          Inviter un membre
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            invite.mutate({ email: inviteEmail, role: inviteRole })
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-400"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-xl bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-400"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50 whitespace-nowrap"
          >
            {invite.isPending ? 'Envoi...' : 'Inviter'}
          </button>
        </form>
        {inviteSuccess && (
          <p className="mt-3 text-sm text-green-400">✅ Invitation envoyée avec succès !</p>
        )}
        {invite.isError && (
          <p className="mt-3 text-sm text-red-400">❌ Erreur lors de l'envoi</p>
        )}
      </div>

      {/* Staff table */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800">
          <h2 className="font-bold text-white">Membres actifs</h2>
        </div>

        {isLoading ? (
          <div className="space-y-px p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-800" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="py-12 text-center text-neutral-600 text-sm">
            <p className="text-2xl mb-2">👥</p>
            <p>Aucun membre du personnel</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{member.name || '—'}</p>
                  <p className="text-xs text-neutral-500 truncate">{member.email}</p>
                </div>

                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyle(member.role)}`}>
                  {roleLabel(member.role)}
                </span>

                {/* Role change */}
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value })}
                    className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (confirm(`Révoquer l'accès de ${member.name || member.email} ?`)) {
                        revoke.mutate(member.id)
                      }
                    }}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 p-1.5 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Révoquer l'accès"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <span key={r.value} className={`rounded-full px-3 py-1 text-xs font-medium ${r.color}`}>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
