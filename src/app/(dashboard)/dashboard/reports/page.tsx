'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, ShoppingBag, XCircle, Package } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'tastytime'

interface SalesReport {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageBasket: number
  topProducts: Array<{ name: string; count: number }>
  peakHours: Array<{ hour: number; orderCount: number }>
  dailyRevenue: Array<{ date: string; revenue: number }>
}

const COLORS = ['#facc15', '#f59e0b', '#fb923c', '#f87171', '#a78bfa', '#34d399']

function StatCard({ label, value, sub, icon: Icon, color = 'yellow' }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-neutral-400">{label}</p>
        <div className={`rounded-xl p-2 ${color === 'yellow' ? 'bg-yellow-400/10' : color === 'green' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`h-5 w-5 ${color === 'yellow' ? 'text-yellow-400' : color === 'green' ? 'text-green-400' : 'text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]!
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!

  const [from, setFrom] = useState(weekAgo)
  const [to, setTo] = useState(today)

  const { data: report, isLoading } = useQuery<SalesReport>({
    queryKey: ['reports', from, to],
    queryFn: async () => {
      const res = await fetch(`${API}/api/reports/sales?from=${from}&to=${to}`, {
        headers: { 'X-Tenant-Slug': TENANT },
        credentials: 'include',
      })
      const json = await res.json()
      return json.data
    },
  })

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-yellow-400">Rapports</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {isLoading || !report ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-900" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Chiffre d'affaires"
              value={`${report.totalRevenue.toFixed(0)} MAD`}
              sub={`${report.completedOrders} commandes livrées`}
              icon={TrendingUp}
              color="yellow"
            />
            <StatCard
              label="Panier moyen"
              value={`${report.averageBasket.toFixed(0)} MAD`}
              icon={ShoppingBag}
              color="green"
            />
            <StatCard
              label="Total commandes"
              value={String(report.totalOrders)}
              icon={Package}
              color="yellow"
            />
            <StatCard
              label="Annulées"
              value={String(report.cancelledOrders)}
              sub={`${report.totalOrders > 0 ? ((report.cancelledOrders / report.totalOrders) * 100).toFixed(1) : 0}% du total`}
              icon={XCircle}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Daily revenue */}
            {report.dailyRevenue.length > 0 && (
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
                <h2 className="mb-4 font-semibold text-white">Revenus journaliers (MAD)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={report.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 12 }}
                      labelStyle={{ color: '#a3a3a3' }}
                      itemStyle={{ color: '#facc15' }}
                      formatter={(v: number) => [`${v} MAD`, 'Revenus']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#facc15" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Peak hours */}
            {report.peakHours.length > 0 && (
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
                <h2 className="mb-4 font-semibold text-white">Heures de pointe</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="hour" tick={{ fill: '#737373', fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                    <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 12 }}
                      labelStyle={{ color: '#a3a3a3' }}
                      itemStyle={{ color: '#facc15' }}
                      labelFormatter={(v) => `${v}h00`}
                      formatter={(v: number) => [v, 'Commandes']}
                    />
                    <Bar dataKey="orderCount" fill="#facc15" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top products */}
          {report.topProducts.length > 0 && (
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5">
              <h2 className="mb-4 font-semibold text-white">Meilleures ventes</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {report.topProducts.slice(0, 8).map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-6 text-xs text-neutral-500 text-right">{i + 1}</span>
                      <div className="flex-1 bg-neutral-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-yellow-400"
                          style={{ width: `${(p.count / (report.topProducts[0]?.count ?? 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-white min-w-32 truncate">{p.name}</span>
                      <span className="text-sm font-semibold text-yellow-400 w-8 text-right">{p.count}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={report.topProducts.slice(0, 6)}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {report.topProducts.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
