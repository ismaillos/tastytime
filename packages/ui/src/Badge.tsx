import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  color?: 'yellow' | 'green' | 'red' | 'blue' | 'neutral'
}

export function Badge({ children, color = 'neutral' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-yellow-400/20 text-yellow-400': color === 'yellow',
          'bg-green-500/20 text-green-400': color === 'green',
          'bg-red-500/20 text-red-400': color === 'red',
          'bg-blue-500/20 text-blue-400': color === 'blue',
          'bg-neutral-700 text-neutral-300': color === 'neutral',
        },
      )}
    >
      {children}
    </span>
  )
}
