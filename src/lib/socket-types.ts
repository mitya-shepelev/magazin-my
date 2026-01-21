// Shared types for Socket.io client

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ'

export interface MessagePayload {
  id: string
  orderId: string
  userId: string
  content: string
  files: Array<{ name: string; url: string; type: string }>
  isRead: boolean // deprecated, use status
  status: MessageStatus
  deliveredAt: string | null
  readAt: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    role: string
  }
}

export interface TypingPayload {
  userId: string
  isTyping: boolean
}

export interface PresencePayload {
  userId: string
  orderId: string
}

export interface ReadPayload {
  messageIds: string[]
  readBy: string
}

export interface DeliveredPayload {
  messageId: string
}

export interface StagePayload {
  id: string
  orderId: string
  title: string
  description: string | null
  type: string
  status: string
  sortOrder: number
  completedAt: string | null
}

export interface StageCommentPayload {
  stageId: string
  comment: {
    id: string
    userId: string
    content: string
    files: unknown
    createdAt: string
    user: {
      id: string
      name: string | null
      role: string
    }
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
  'typing': (data: TypingPayload) => void
  'message:delivered': (data: DeliveredPayload) => void
  'message:read': (data: ReadPayload) => void
  'user:online': (data: PresencePayload) => void
  'user:offline': (data: PresencePayload) => void
  'stage:updated': (data: StagePayload) => void
  'stage:comment': (data: StageCommentPayload) => void
  'error': (data: { message: string }) => void
}
