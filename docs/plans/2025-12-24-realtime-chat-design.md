# Real-time Chat Design

## Overview

Real-time functionality for order chat between admin and customers using Socket.io + Redis Pub/Sub.

## Requirements

| Aspect | Solution |
|--------|----------|
| Technology | Socket.io + separate Node.js server |
| Sync | Redis Pub/Sub |
| Online status | In chat + admin order list |
| Typing indicator | Yes |
| Read receipts | Delivered / Read |
| Notifications | Badge + Sound + Push |
| API approach | Hybrid (REST + WebSocket events) |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │     │  Socket.io      │
│   (container 1) │     │  Server         │
│                 │     │  (container 2)  │
│  - REST API     │     │                 │
│  - SSR/Pages    │     │  - WS connections│
│  - Auth         │     │  - Event routing │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    Redis Pub/Sub      │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │    Redis    │
              └─────────────┘
```

**Flow:**
1. Client connects to Socket.io server on page open
2. Message sent via REST API (POST /api/orders/[id]/messages)
3. Next.js API publishes event to Redis after DB save
4. Socket.io server receives event and broadcasts to room
5. Clients receive message instantly via WebSocket

## Socket.io Server Structure

```
ws-server/
├── package.json
├── Dockerfile
├── src/
│   ├── index.ts          # Entry point
│   ├── socket.ts         # Socket.io config
│   ├── auth.ts           # JWT verification
│   ├── redis.ts          # Redis Pub/Sub subscription
│   └── handlers/
│       ├── connection.ts # Online/offline status
│       ├── typing.ts     # Typing indicators
│       └── presence.ts   # Presence tracking
```

## Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join:order` | `{orderId}` | Join order room |
| `leave:order` | `{orderId}` | Leave room |
| `typing:start` | `{orderId}` | Started typing |
| `typing:stop` | `{orderId}` | Stopped typing |
| `message:read` | `{orderId, messageId}` | Read message |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `message:new` | `{message}` | New message |
| `typing` | `{userId, isTyping}` | Typing status |
| `message:delivered` | `{messageId}` | Message delivered |
| `message:read` | `{messageId, readBy}` | Message read |
| `user:online` | `{userId, orderId}` | User online |
| `user:offline` | `{userId, orderId}` | User offline |

### Rooms

- `order:{orderId}` — all chat participants
- `admin:orders` — all admins (for order list updates)

## Authentication

JWT token on connection with 5-minute TTL.

**New API endpoint:**
```typescript
// POST /api/auth/ws-token
{
  token: "eyJhbG...",
  expiresIn: 300
}
```

**JWT payload:**
```typescript
{
  userId: "user_123",
  role: "CUSTOMER" | "ADMIN",
  allowedOrders: ["order_456"],
  iat: 1703001234,
  exp: 1703001534
}
```

**Client connection:**
```typescript
const { token } = await fetch('/api/auth/ws-token').then(r => r.json())
const socket = io('wss://ws.yoursite.com', { auth: { token } })
```

## Presence (Online Status)

**Redis storage:**
```
online:users → Set { "user_123", "user_456" }

presence:user_123 → {
  visitorId: "user_123",
  role: "CUSTOMER",
  currentOrder: "order_456",
  connectedAt: 1703001234,
  socketId: "abc123"
}

online:order:456 → Set { "user_123", "admin_1" }
```

**Heartbeat:** ping every 30 sec, 3 missed = offline

## Typing & Read Receipts

**Typing:**
- `typing:start` on first keypress
- `typing:stop` after 2 sec debounce
- Broadcast to room (except sender)

**Message statuses:**

| Status | Icon | When |
|--------|------|------|
| `SENT` | ○ | Saved to DB |
| `DELIVERED` | ✓ | Recipient online, event delivered |
| `READ` | ✓✓ | Recipient opened chat / scrolled to message |

**Schema changes:**
```prisma
model OrderMessage {
  // ... existing fields
  status      MessageStatus @default(SENT)
  deliveredAt DateTime?
  readAt      DateTime?
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}
```

## Notifications

### Badge
- Red counter in sidebar menu
- Zustand store for unread counts
- API `/api/messages/unread-count` on page load

### Sound
- `notification.mp3` on new message
- Only if tab not focused OR in different chat
- Toggle in user settings

### Push Notifications
- Web Push API + Service Worker
- Only sent if user offline (no active socket)
- Uses `web-push` library

**New model:**
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  keys      Json     // {p256dh, auth}
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

## Next.js Integration

**Publish events from API:**
```typescript
// src/lib/realtime.ts
export const realtime = {
  async publishMessage(orderId: string, message: OrderMessage) {
    await redis.publish(`order:${orderId}:events`, JSON.stringify({
      type: 'message:new',
      payload: message
    }))
  },

  async publishRead(orderId: string, messageIds: string[], readBy: string) {
    await redis.publish(`order:${orderId}:events`, JSON.stringify({
      type: 'message:read',
      payload: { messageIds, readBy }
    }))
  },

  async publishStageUpdate(orderId: string, stage: InstallationStage) {
    await redis.publish(`order:${orderId}:events`, JSON.stringify({
      type: 'stage:updated',
      payload: stage
    }))
  }
}
```

**Usage in existing routes:**
```typescript
// Add one line after DB save
await realtime.publishMessage(orderId, message)
```

## Client-side Structure

```
src/
├── lib/
│   └── socket.ts            # Socket.io client (singleton)
├── hooks/
│   ├── useSocket.ts         # Connection management
│   ├── useOrderChat.ts      # Order chat logic
│   ├── useTyping.ts         # Typing indicator
│   ├── usePresence.ts       # Online status
│   └── useNotifications.ts  # Badge + sound + push
├── providers/
│   └── SocketProvider.tsx   # Context for socket instance
└── stores/
    └── notificationStore.ts # Zustand for counters
```

**useOrderChat hook:**
```typescript
const {
  messages,
  sendMessage,
  isTyping,
  typingUser,
  onlineUsers,
  markAsRead,
} = useOrderChat(orderId)
```

## Deployment (Dokploy)

**Two services:**

| Service | Type | Port | Domain |
|---------|------|------|--------|
| Next.js | Application | 3000 | magazin.ru |
| WS Server | Application | 3001 | ws.magazin.ru |

**Environment variables:**
```bash
# Next.js
NEXT_PUBLIC_WS_URL=wss://ws.magazin.ru

# WS Server
REDIS_URL=redis://redis:6379
JWT_SECRET=shared_secret_with_nextjs
PORT=3001
CORS_ORIGIN=https://magazin.ru
```

**docker-compose.yml (local dev):**
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]

  ws:
    build: ./ws-server
    ports: ["3001:3001"]
    environment:
      - REDIS_URL=redis://redis:6379

  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

## Implementation Plan

### Phase 1: Basic WebSocket Server (MVP)
1. Create `ws-server/` with Socket.io
2. Configure Redis Pub/Sub subscription
3. JWT authentication on connect
4. API endpoint `/api/auth/ws-token`
5. Basic events: `join:order`, `leave:order`

### Phase 2: Real-time Messages
1. Add `realtime.publishMessage()` to API
2. Create `SocketProvider` and `useSocket` hook
3. Update `ClientOrderChat` and `OrderChat` components
4. Test message delivery

### Phase 3: Presence (Online Status)
1. Store presence in Redis
2. Events `user:online` / `user:offline`
3. Hook `usePresence`
4. UI: green dot in chat and order list

### Phase 4: Typing & Read Receipts
1. Add fields to `OrderMessage` model
2. Typing events with debounce
3. `DELIVERED` / `READ` logic
4. UI: "typing..." indicator and checkmarks

### Phase 5: Notifications
1. Zustand store for counters
2. Sound notifications
3. Service Worker + Web Push API
4. Model `PushSubscription`
5. Notification settings in profile

### Phase 6: Deploy
1. docker-compose for local dev
2. Configure Dokploy (two services)
3. SSL and CORS
