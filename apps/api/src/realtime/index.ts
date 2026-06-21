import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@tastytime/types'
import { createLogger } from '@tastytime/logger'

const log = createLogger({ module: 'realtime' })

let io: SocketServer<ClientToServerEvents, ServerToClientEvents>

export function initSocketIO(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    log.debug({ socketId: socket.id }, 'Client connected')

    socket.on('order:track', (orderId) => {
      socket.join(`order:${orderId}`)
      log.debug({ socketId: socket.id, orderId }, 'Tracking order')
    })

    // Kitchen joins tenant room to receive new order alerts
    socket.on('kitchen:join', (tenantId: string) => {
      socket.join(`kitchen:${tenantId}`)
      log.debug({ socketId: socket.id, tenantId }, 'Kitchen joined')
    })

    // Dashboard joins tenant room for live stats
    socket.on('dashboard:join', (tenantId: string) => {
      socket.join(`dashboard:${tenantId}`)
      log.debug({ socketId: socket.id, tenantId }, 'Dashboard joined')
    })

    // Driver joins own room to receive order assignments
    socket.on('driver:join', (driverId: string) => {
      socket.join(`driver:${driverId}`)
      socket.data.driverId = driverId
      log.debug({ socketId: socket.id, driverId }, 'Driver joined')
    })

    socket.on('driver:update_location', ({ lat, lng }) => {
      const driverId = socket.data.driverId as string | undefined
      if (!driverId) return
      io.to(`dashboard:${socket.data.tenantId}`).emit('driver:location', { driverId, lat, lng })
    })

    socket.on('disconnect', () => {
      log.debug({ socketId: socket.id }, 'Client disconnected')
    })
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

// Helpers used by order service to broadcast events
export function emitOrderStatusChanged(orderId: string, status: string, tenantId: string) {
  const ioInstance = getIO()
  ioInstance.to(`order:${orderId}`).emit('order:status_changed', { orderId, status: status as never })
  ioInstance.to(`kitchen:${tenantId}`).emit('order:status_changed', { orderId, status: status as never })
  ioInstance.to(`dashboard:${tenantId}`).emit('order:status_changed', { orderId, status: status as never })
}

export function emitNewOrder(order: object, tenantId: string) {
  const ioInstance = getIO()
  ioInstance.to(`kitchen:${tenantId}`).emit('order:new', order as never)
  ioInstance.to(`dashboard:${tenantId}`).emit('order:new', order as never)
}

export function emitOrderAssignedToDriver(driverId: string, order: object) {
  const ioInstance = getIO()
  ioInstance.to(`driver:${driverId}`).emit('driver:order_assigned' as never, order as never)
}
