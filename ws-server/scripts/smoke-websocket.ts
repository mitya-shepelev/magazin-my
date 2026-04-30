import { createServer, type Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import jwt from 'jsonwebtoken'
import { io as createClient, type Socket } from 'socket.io-client'

const jwtSecret = 'websocket-smoke-secret-at-least-32-chars'
const orderId = `order_ws_smoke_${Date.now()}`
const ownerId = `owner_ws_smoke_${Date.now()}`
const adminId = `admin_ws_smoke_${Date.now()}`
const otherUserId = `other_ws_smoke_${Date.now()}`

process.env.WS_JWT_SECRET = jwtSecret
process.env.CORS_ORIGIN = 'http://localhost:3000'
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379'

type SocketPayload = Record<string, unknown>

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function logStep(message: string) {
  console.log(`✓ ${message}`)
}

async function waitForSocketEvent<T = SocketPayload>(
  socket: Socket,
  eventName: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 3000
) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, onEvent)
      reject(new Error(`Timed out waiting for socket event ${eventName}`))
    }, timeoutMs)

    function onEvent(payload: T) {
      if (!predicate(payload)) {
        return
      }

      clearTimeout(timeout)
      socket.off(eventName, onEvent)
      resolve(payload)
    }

    socket.on(eventName, onEvent)
  })
}

function signToken(payload: {
  userId: string
  role: 'CUSTOMER' | 'ADMIN'
  allowedOrders: string[]
}) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '5m' })
}

async function expectConnectError(
  serverUrl: string,
  token: string | undefined,
  expectedMessage: string
) {
  const socket = createClient(serverUrl, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
    timeout: 1000,
  })

  try {
    const error = await waitForSocketEvent<Error>(
      socket,
      'connect_error',
      (payload) => payload.message === expectedMessage
    )
    assert(error.message === expectedMessage, `Expected ${expectedMessage} connect error`)
  } finally {
    socket.disconnect()
  }
}

async function connectSocket(serverUrl: string, token: string) {
  const socket = createClient(serverUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  })

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onError)
      reject(new Error('Timed out waiting for socket connection'))
    }, 3000)

    function onConnect() {
      clearTimeout(timeout)
      socket.off('connect_error', onError)
      resolve()
    }

    function onError(error: Error) {
      clearTimeout(timeout)
      socket.off('connect', onConnect)
      reject(error)
    }

    socket.once('connect', onConnect)
    socket.once('connect_error', onError)
  })

  return socket
}

async function waitForPatternSubscription(subscriber: {
  once(eventName: 'psubscribe', listener: (...args: unknown[]) => void): void
}) {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 1000)

    subscriber.once('psubscribe', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

async function listen(httpServer: HttpServer) {
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve)
  })

  const address = httpServer.address()
  assert(address && typeof address !== 'string', 'HTTP server should expose an address')
  return address as AddressInfo
}

async function closeHttpServer(httpServer: HttpServer) {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING') {
          resolve()
          return
        }

        reject(error)
        return
      }
      resolve()
    })
  })
}

async function closeSocketServer(io: { close(callback?: () => void): void }) {
  await new Promise<void>((resolve) => {
    io.close(resolve)
  })
}

async function waitForSocketDisconnect(socket: Socket) {
  if (!socket.connected) {
    return
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 1000)

    socket.once('disconnect', () => {
      clearTimeout(timeout)
      resolve()
    })

    socket.disconnect()
  })
}

async function closeRedisClient(client: { quit(): Promise<string>; disconnect(): void }) {
  try {
    await client.quit()
  } catch {
    client.disconnect()
  }
}

async function cleanupRedis(redis: { del(...keys: string[]): Promise<number> }) {
  await redis.del(
    'online:users',
    `presence:${ownerId}`,
    `presence:${adminId}`,
    `presence:${otherUserId}`,
    `online:order:${orderId}`
  )
}

async function main() {
  const [{ createSocketServer }, { redis, subscriber }] = await Promise.all([
    import('../src/socket.js'),
    import('../src/redis.js'),
  ])

  await cleanupRedis(redis)

  const patternSubscription = waitForPatternSubscription(subscriber)
  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
      return
    }

    response.writeHead(404)
    response.end()
  })
  const io = createSocketServer(httpServer)
  const address = await listen(httpServer)
  const serverUrl = `http://127.0.0.1:${address.port}`

  await patternSubscription

  const connectedSockets: Socket[] = []

  try {
    const healthResponse = await fetch(`${serverUrl}/health`)
    assert(healthResponse.status === 200, 'Health endpoint should return 200')
    assert((await healthResponse.json()).status === 'ok', 'Health endpoint should return ok status')
    logStep('health endpoint responds')

    await expectConnectError(serverUrl, undefined, 'Authentication required')
    await expectConnectError(serverUrl, 'not-a-valid-token', 'Invalid token')
    logStep('socket auth rejects missing and invalid tokens')

    const ownerSocket = await connectSocket(
      serverUrl,
      signToken({
        userId: ownerId,
        role: 'CUSTOMER',
        allowedOrders: [orderId],
      })
    )
    connectedSockets.push(ownerSocket)

    const adminSocket = await connectSocket(
      serverUrl,
      signToken({
        userId: adminId,
        role: 'ADMIN',
        allowedOrders: [],
      })
    )
    connectedSockets.push(adminSocket)

    const otherSocket = await connectSocket(
      serverUrl,
      signToken({
        userId: otherUserId,
        role: 'CUSTOMER',
        allowedOrders: [],
      })
    )
    connectedSockets.push(otherSocket)
    logStep('valid owner, admin, and unrelated customer sockets connect')

    const ownerOnline = waitForSocketEvent(ownerSocket, 'user:online', (payload) => {
      return payload.userId === ownerId && payload.orderId === orderId
    })
    ownerSocket.emit('join:order', { orderId })
    await ownerOnline

    assert(
      (await redis.sismember(`online:order:${orderId}`, ownerId)) === 1,
      'Owner should be tracked in the order room'
    )
    logStep('allowed customer joins order room and presence is tracked')

    const accessDenied = waitForSocketEvent(otherSocket, 'error', (payload) => {
      return payload.message === 'Access denied to this order'
    })
    otherSocket.emit('join:order', { orderId })
    await accessDenied
    assert(
      (await redis.sismember(`online:order:${orderId}`, otherUserId)) === 0,
      'Unrelated customer should not be tracked in the order room'
    )
    logStep('unrelated customer is denied order room access')

    const adminOnline = waitForSocketEvent(adminSocket, 'user:online', (payload) => {
      return payload.userId === adminId && payload.orderId === orderId
    })
    adminSocket.emit('join:order', { orderId })
    await adminOnline
    assert(
      (await redis.sismember(`online:order:${orderId}`, adminId)) === 1,
      'Admin should be tracked in the order room'
    )
    logStep('admin joins any order room')

    const typingEvent = waitForSocketEvent(adminSocket, 'typing', (payload) => {
      return payload.userId === ownerId && payload.isTyping === true
    })
    ownerSocket.emit('typing:start', { orderId })
    await typingEvent
    logStep('typing events are broadcast inside order room')

    const messagePayload = {
      id: `message_${orderId}`,
      orderId,
      userId: ownerId,
      content: 'Smoke realtime message',
      files: [],
      isRead: false,
      status: 'SENT',
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      user: {
        id: ownerId,
        name: 'Smoke Owner',
        role: 'CUSTOMER',
      },
    }

    const ownerMessageEvent = waitForSocketEvent(ownerSocket, 'message:new', (payload) => {
      return payload.id === messagePayload.id && payload.content === messagePayload.content
    })
    const adminMessageEvent = waitForSocketEvent(adminSocket, 'message:new', (payload) => {
      return payload.id === messagePayload.id && payload.content === messagePayload.content
    })

    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: 'message:new',
        payload: messagePayload,
      })
    )

    await Promise.all([ownerMessageEvent, adminMessageEvent])
    logStep('Redis message:new events are broadcast to order room clients')

    const readPayload = {
      messageIds: [messagePayload.id],
      readBy: adminId,
    }
    const ownerReadEvent = waitForSocketEvent(ownerSocket, 'message:read', (payload) => {
      return Array.isArray(payload.messageIds) && payload.messageIds[0] === messagePayload.id
    })
    const adminReadEvent = waitForSocketEvent(adminSocket, 'message:read', (payload) => {
      return payload.readBy === adminId
    })

    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: 'message:read',
        payload: readPayload,
      })
    )

    await Promise.all([ownerReadEvent, adminReadEvent])
    logStep('Redis message:read events are broadcast to order room clients')

    const offlineEvent = waitForSocketEvent(adminSocket, 'user:offline', (payload) => {
      return payload.userId === ownerId && payload.orderId === orderId
    })
    ownerSocket.emit('leave:order', { orderId })
    await offlineEvent
    assert(
      (await redis.sismember(`online:order:${orderId}`, ownerId)) === 0,
      'Owner should be removed from order presence after leaving'
    )
    logStep('leave:order clears presence and broadcasts offline event')
  } finally {
    await Promise.all(connectedSockets.map((socket) => waitForSocketDisconnect(socket)))
    await closeSocketServer(io)
    await closeHttpServer(httpServer)
    await cleanupRedis(redis)
    await subscriber.punsubscribe('order:*:events')
    await closeRedisClient(subscriber)
    await closeRedisClient(redis)
  }
}

main()
  .then(() => {
    console.log('WebSocket smoke passed')
  })
  .catch((error) => {
    console.error('WebSocket smoke failed')
    console.error(error)
    process.exit(1)
  })
