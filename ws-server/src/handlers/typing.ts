import type { Server } from 'socket.io'
import { canAccessOrder } from '../auth.js'
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types.js'

export function setupTypingHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
): void {
  const { userId } = socket.data

  socket.on('typing:start', ({ orderId }) => {
    if (!canAccessOrder(socket, orderId)) {
      return
    }

    const roomName = `order:${orderId}`
    socket.to(roomName).emit('typing', { userId, isTyping: true })
  })

  socket.on('typing:stop', ({ orderId }) => {
    if (!canAccessOrder(socket, orderId)) {
      return
    }

    const roomName = `order:${orderId}`
    socket.to(roomName).emit('typing', { userId, isTyping: false })
  })
}
