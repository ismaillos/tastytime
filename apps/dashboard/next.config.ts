import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@tastytime/ui', '@tastytime/types', '@tastytime/validators'],
}

export default nextConfig
