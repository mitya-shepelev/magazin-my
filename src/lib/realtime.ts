import { redis } from "./redis"

interface MessagePayload {
  id: string
  orderId: string
  userId: string
  content: string
  files: Array<{ name: string; url: string; type: string }>
  isRead: boolean
  createdAt: Date
  user: {
    id: string
    name: string | null
    role: string
  }
}

interface StagePayload {
  id: string
  orderId: string
  title: string
  description: string | null
  type: string
  status: string
  sortOrder: number
  completedAt: Date | null
}

interface CommentPayload {
  id: string
  stageId: string
  userId: string
  content: string
  files: unknown
  createdAt: Date
  user: {
    id: string
    name: string | null
    role: string
  }
}

/**
 * Publish real-time events to Redis Pub/Sub
 * These events are picked up by the WebSocket server and broadcast to connected clients
 */
export const realtime = {
  /**
   * Publish new message event
   */
  async publishMessage(orderId: string, message: MessagePayload): Promise<void> {
    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: "message:new",
        payload: message,
      })
    )
  },

  /**
   * Publish message read event
   */
  async publishRead(
    orderId: string,
    messageIds: string[],
    readBy: string
  ): Promise<void> {
    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: "message:read",
        payload: { messageIds, readBy },
      })
    )
  },

  /**
   * Publish message delivered event
   */
  async publishDelivered(orderId: string, messageId: string): Promise<void> {
    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: "message:delivered",
        payload: { messageId },
      })
    )
  },

  /**
   * Publish stage update event
   */
  async publishStageUpdate(orderId: string, stage: StagePayload): Promise<void> {
    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: "stage:updated",
        payload: stage,
      })
    )
  },

  /**
   * Publish new stage comment event
   */
  async publishStageComment(
    orderId: string,
    stageId: string,
    comment: CommentPayload
  ): Promise<void> {
    await redis.publish(
      `order:${orderId}:events`,
      JSON.stringify({
        type: "stage:comment",
        payload: { stageId, comment },
      })
    )
  },

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const result = await redis.sismember("online:users", userId)
    return result === 1
  },

  /**
   * Get online users in order room
   */
  async getOnlineUsersInOrder(orderId: string): Promise<string[]> {
    return redis.smembers(`online:order:${orderId}`)
  },
}
