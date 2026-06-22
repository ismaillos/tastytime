const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': TENANT_SLUG,
      ...options?.headers,
    },
    credentials: 'include',
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error ?? 'API error')
  return data.data as T
}

export const api = {
  menu: {
    categories: () => apiFetch<unknown[]>('/api/menu/categories'),
    products: (categoryId?: string) =>
      apiFetch<unknown[]>(`/api/menu/products${categoryId ? `?categoryId=${categoryId}` : ''}`),
    product: (id: string) => apiFetch<unknown>(`/api/menu/products/${id}`),
  },
  orders: {
    create: (body: unknown) =>
      apiFetch<unknown>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => apiFetch<unknown>(`/api/orders/${id}`),
    list: (status?: string) =>
      apiFetch<unknown[]>(`/api/orders${status ? `?status=${status}` : ''}`),
    updateStatus: (id: string, body: { status: string }) =>
      apiFetch<unknown>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  dashboard: {
    stats: () => apiFetch<unknown>('/api/dashboard/stats'),
  },
}
