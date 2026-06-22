// Socket.IO is only available in self-hosted mode (apps/api/src/server.ts).
// In serverless (Vercel/Next.js API routes) these are no-ops.

export function getIO() {
  return {
    to: (_room: string) => ({
      emit: (_event: string, _data?: unknown) => {},
    }),
  }
}

export function emitOrderStatusChanged(_orderId: string, _status: string, _tenantId: string) {}
export function emitNewOrder(_order: object, _tenantId: string) {}
export function emitOrderAssignedToDriver(_driverId: string, _order: object) {}
