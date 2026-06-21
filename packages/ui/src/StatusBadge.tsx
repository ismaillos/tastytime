import { Badge } from './Badge'
import type { OrderStatus } from '@tastytime/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: 'yellow' | 'green' | 'red' | 'blue' | 'neutral' }> = {
  received: { label: 'Reçue', color: 'blue' },
  accepted: { label: 'Acceptée', color: 'yellow' },
  preparing: { label: 'En préparation', color: 'yellow' },
  ready: { label: 'Prête', color: 'green' },
  out_for_delivery: { label: 'En livraison', color: 'blue' },
  delivered: { label: 'Livrée', color: 'green' },
  cancelled: { label: 'Annulée', color: 'red' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge color={config.color}>{config.label}</Badge>
}
