'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  loyaltyPoints: number
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/auth/get-session`, {
      headers: { 'X-Tenant-Slug': TENANT },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function signOut() {
    await fetch(`${API}/api/auth/sign-out`, {
      method: 'POST',
      headers: { 'X-Tenant-Slug': TENANT },
      credentials: 'include',
    })
    setUser(null)
    window.location.href = '/'
  }

  return { user, loading, signOut }
}
