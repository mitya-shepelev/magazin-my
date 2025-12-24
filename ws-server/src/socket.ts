import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { config } from './config.js'
import { authMiddleware } from './auth.js'
import { subscriber } from './redis.js'
import { setupConnectionHandlers } from './handlers/connection.js'
import { setupTypingHandlers } from './handlers/typing.js'
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  RedisEvent,
} from './types.js'

export function createSocketServer(
  httpServer: HttpServer
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Authentication middleware
  io.use(authMiddleware)

  // Connection handler
  io.on('connection', (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket

    setupConnectionHandlers(io, authenticatedSocket)
    setupTypingHandlers(io, authenticatedSocket)
  })

  // Subscribe to Redis Pub/Sub for events from Next.js
  setupRedisSubscription(io)

  return io
}

async function setupRedisSubscription(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
  // Subscribe to all order events using pattern
  await subscriber.psubscribe('order:*:events')

  subscriber.on('pmessage', (pattern, channel, message) => {
    try {
      // Extract orderId from channel: "order:123:events" → "123"
      const parts = channel.split(':')
      const orderId = parts[1]

      if (!orderId) {
        console.error('[Redis] Invalid channel format:', channel)
        return
      }

      const event: RedisEvent = JSON.parse(message)
      const roomName = `order:${orderId}`

      console.log(`[Redis] Event received: ${event.type} for order:${orderId}`)

      // Broadcast to room
      io.to(roomName).emit(event.type as keyof ServerToClientEvents, event.payload as never)

      // If it's a new message, also notify admins not in the room
      if (event.type === 'message:new') {
        io.to('admin:orders').emit('message:new', event.payload as never)
      }
    } catch (error) {
      console.error('[Redis] Failed to parse message:', error)
    }
  })

  console.log('[Redis] Subscribed to order:*:events')
}
