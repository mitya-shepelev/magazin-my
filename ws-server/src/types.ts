import type { Socket } from 'socket.io'

export interface JwtPayload {
  userId: string
  role: 'CUSTOMER' | 'ADMIN'
  allowedOrders: string[]
  iat: number
  exp: number
}

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string
    role: 'CUSTOMER' | 'ADMIN'
    allowedOrders: string[]
  }
}

// Client → Server events
export interface ClientToServerEvents {
  'join:order': (data: { orderId: string }) => void
  'leave:order': (data: { orderId: string }) => void
  'typing:start': (data: { orderId: string }) => void
  'typing:stop': (data: { orderId: string }) => void
  'message:read': (data: { orderId: string; messageId: string }) => void
}

// Server → Client events
export interface ServerToClientEvents {
  'message:new': (data: MessagePayload) => void
  'typing': (data: { userId: string; isTyping: boolean }) => void
  'message:delivered': (data: { messageId: string }) => void
  'message:read': (data: { messageId: string; readBy: string }) => void
  'user:online': (data: { userId: string; orderId: string }) => void
  'user:offline': (data: { userId: string; orderId: string }) => void
  'error': (data: { message: string }) => void
}

export interface MessagePayload {
  id: string
  orderId: string
  userId: string
  content: string
  files: Array<{ name: string; url: string; type: string }>
  isRead: boolean
  createdAt: string
  user: {
    id: string
    name: string
    role: string
  }
}

export interface RedisEvent {
  type: string
  payload: unknown
}
