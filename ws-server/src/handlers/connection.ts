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

    // Send current online status for all orders
    sendCurrentOnlineStatus(socket)
  }

  async function sendCurrentOnlineStatus(adminSocket: AuthenticatedSocket) {
    try {
      // Get all online:order:* keys
      const keys = await redis.keys('online:order:*')
      for (const key of keys) {
        const orderId = key.replace('online:order:', '')
        const onlineUsers = await redis.smembers(key)
        for (const onlineUserId of onlineUsers) {
          adminSocket.emit('user:online', { userId: onlineUserId, orderId })
        }
      }
    } catch (error) {
      console.error('[Socket] Error sending online status to admin:', error)
    }
  }

  // Handle joining order room
  socket.on('join:order', ({ orderId }) => {
    void handleJoinOrder(orderId)
  })

  async function handleJoinOrder(orderId: string) {
    if (!canAccessOrder(socket, orderId)) {
      socket.emit('error', { message: 'Access denied to this order' })
      return
    }

    try {
      const roomName = `order:${orderId}`

      // Get currently online users BEFORE joining
      const onlineUsers = await redis.smembers(`online:order:${orderId}`)

      socket.join(roomName)

      // Track user in order room
      await redis.sadd(`online:order:${orderId}`, userId)
      await redis.hset(`presence:${userId}`, 'currentOrder', orderId)

      // Send the joining user a list of who's already online
      for (const onlineUserId of onlineUsers) {
        if (onlineUserId !== userId) {
          socket.emit('user:online', { userId: onlineUserId, orderId })
        }
      }

      // Notify others in room (including the joining user so they see themselves as online)
      io.to(roomName).emit('user:online', { userId, orderId })

      // Notify admins
      io.to('admin:orders').emit('user:online', { userId, orderId })

      console.log(`[Socket] User ${userId} joined order:${orderId}`)
    } catch (error) {
      console.error('[Socket] Error joining order room:', error)
      socket.emit('error', { message: 'Failed to join order room' })
    }
  }

  // Handle leaving order room
  socket.on('leave:order', ({ orderId }) => {
    void handleLeaveOrder(orderId)
  })

  async function handleLeaveOrder(orderId: string) {
    try {
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
    } catch (error) {
      console.error('[Socket] Error leaving order room:', error)
      socket.emit('error', { message: 'Failed to leave order room' })
    }
  }

  // Handle disconnect
  socket.on('disconnect', () => {
    void handleDisconnect()
  })

  async function handleDisconnect() {
    console.log(`[Socket] User disconnected: ${userId}`)

    try {
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
    } catch (error) {
      console.error('[Socket] Error cleaning up disconnected socket:', error)
    }
  }
}
