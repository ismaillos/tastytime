'use client'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Props {
  categories: Array<{ id: string; slug: string; nameFr: string }>
  selected: string | null
  onSelect: (id: string | null) => void
}

export function CategoryTabs({ categories, selected, onSelect }: Props) {
  const t = useTranslations('categories')

  return (
    <div className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur border-b border-neutral-800 px-4">
      <div className="mx-auto max-w-6xl flex gap-2 overflow-x-auto py-3 scrollbar-hide">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            selected === null
              ? 'bg-yellow-400 text-black'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
          )}
        >
          Tout
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selected === cat.id
                ? 'bg-yellow-400 text-black'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
            )}
          >
            {t(cat.slug as Parameters<typeof t>[0]) || cat.nameFr}
          </button>
        ))}
      </div>
    </div>
  )
}
