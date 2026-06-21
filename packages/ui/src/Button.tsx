import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50',
          {
            'bg-yellow-400 text-black hover:bg-yellow-300': variant === 'primary',
            'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700': variant === 'secondary',
            'text-neutral-300 hover:text-white hover:bg-neutral-800': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
        ),
        className,
      )}
      {...props}
    />
  )
}
