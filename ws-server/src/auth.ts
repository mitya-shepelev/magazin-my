import jwt from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import { config } from './config.js'
import type { JwtPayload, AuthenticatedSocket } from './types.js'

export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth.token as string | undefined

  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload

    // Attach user data to socket
    ;(socket as AuthenticatedSocket).data = {
      userId: payload.userId,
      role: payload.role,
      allowedOrders: payload.allowedOrders,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'))
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid token'))
    }
    return next(new Error('Authentication failed'))
  }
}

export function canAccessOrder(
  socket: AuthenticatedSocket,
  orderId: string
): boolean {
  // Admins can access any order
  if (socket.data.role === 'ADMIN') {
    return true
  }

  // Customers can only access their allowed orders
  return socket.data.allowedOrders.includes(orderId)
}
