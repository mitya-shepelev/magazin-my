import type { Server } from 'socket.io'
import { redis } from '../redis.js'
import { canAccessOrder } from '../auth.js'
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types.js'

export function setupConnectionHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
): void {
  const { userId, role } = socket.data

  console.log(`[Socket] User connected: ${userId} (${role})`)

  // Track user as online
  redis.sadd('online:users', userId)
  redis.hset(`presence:${userId}`, {
    visitorId: userId,
    role,
    connectedAt: Date.now().toString(),
    socketId: socket.id,
  })

  // If admin, join admin room for order list updates
  if (role === 'ADMIN') {
    socket.join('admin:orders')
  }

  // Handle joining order room
  socket.on('join:order', async ({ orderId }) => {
    if (!canAccessOrder(socket, orderId)) {
      socket.emit('error', { message: 'Access denied to this order' })
      return
    }

    const roomName = `order:${orderId}`
    socket.join(roomName)

    // Track user in order room
    await redis.sadd(`online:order:${orderId}`, userId)
    await redis.hset(`presence:${userId}`, 'currentOrder', orderId)

    // Notify others in room
    socket.to(roomName).emit('user:online', { userId, orderId })

    // Notify admins
    io.to('admin:orders').emit('user:online', { userId, orderId })

    console.log(`[Socket] User ${userId} joined order:${orderId}`)
  })

  // Handle leaving order room
  socket.on('leave:order', async ({ orderId }) => {
    const roomName = `order:${orderId}`
    socket.leave(roomName)

    // Remove from order tracking
    await redis.srem(`online:order:${orderId}`, userId)
    await redis.hdel(`presence:${userId}`, 'currentOrder')

    // Notify others in room
    socket.to(roomName).emit('user:offline', { userId, orderId })

    // Notify admins
    io.to('admin:orders').emit('user:offline', { userId, orderId })

    console.log(`[Socket] User ${userId} left order:${orderId}`)
  })

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`[Socket] User disconnected: ${userId}`)

    // Get current order before cleanup
    const currentOrder = await redis.hget(`presence:${userId}`, 'currentOrder')

    // Clean up presence data
    await redis.srem('online:users', userId)
    await redis.del(`presence:${userId}`)

    if (currentOrder) {
      await redis.srem(`online:order:${currentOrder}`, userId)

      // Notify others
      const roomName = `order:${currentOrder}`
      socket.to(roomName).emit('user:offline', { userId, orderId: currentOrder })
      io.to('admin:orders').emit('user:offline', { userId, orderId: currentOrder })
    }
  })
}
