'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

function apiHeaders() {
  return { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT }
}

interface Category { id: string; nameFr: string; slug: string; isActive: boolean; sortOrder: number }
interface Product {
  id: string; nameFr: string; basePrice: string; isAvailable: boolean
  categoryId: string; prepTimeMinutes: number; images: string[]
}

export default function MenuManagementPage() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [, setShowProductForm] = useState(false)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/menu/categories`, { headers: apiHeaders() })
      return (await res.json()).data
    },
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin-products', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `${API}/api/menu/products?categoryId=${selectedCategory}`
        : `${API}/api/menu/products`
      const res = await fetch(url, { headers: apiHeaders() })
      return (await res.json()).data
    },
  })

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const res = await fetch(`${API}/api/admin/menu/products/${id}/availability`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ isAvailable }),
        credentials: 'include',
      })
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">Gestion du menu</h1>
        <button
          onClick={() => setShowProductForm(true)}
          className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
        >
          <Plus className="h-4 w-4" /> Ajouter un produit
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Categories sidebar */}
        <div className="col-span-3">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800">
              <p className="text-sm font-semibold text-neutral-300">Catégories</p>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                  selectedCategory === null
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Toutes les catégories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-yellow-400/10 text-yellow-400'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span>{cat.nameFr}</span>
                  {!cat.isActive && <span className="text-xs text-neutral-600">masqué</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products table */}
        <div className="col-span-9">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-300">
                {products.length} produit{products.length !== 1 ? 's' : ''}
              </p>
            </div>

            {products.length === 0 ? (
              <div className="py-16 text-center text-neutral-600">
                <p className="text-2xl mb-2">🍽️</p>
                <p className="text-sm">Aucun produit dans cette catégorie</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Thumbnail */}
                    <div className="h-12 w-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">🍔</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{product.nameFr}</p>
                      <p className="text-xs text-neutral-500">{product.prepTimeMinutes} min de préparation</p>
                    </div>

                    {/* Price */}
                    <span className="text-yellow-400 font-semibold whitespace-nowrap">
                      {Number(product.basePrice).toFixed(0)} MAD
                    </span>

                    {/* Available toggle */}
                    <button
                      onClick={() =>
                        toggleAvailability.mutate({ id: product.id, isAvailable: !product.isAvailable })
                      }
                      className="flex items-center gap-1.5 text-sm"
                    >
                      {product.isAvailable ? (
                        <>
                          <ToggleRight className="h-5 w-5 text-green-400" />
                          <span className="text-green-400 text-xs">Dispo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 text-neutral-600" />
                          <span className="text-neutral-600 text-xs">Indispo</span>
                        </>
                      )}
                    </button>

                    {/* Edit */}
                    <button className="rounded-xl bg-neutral-800 p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
