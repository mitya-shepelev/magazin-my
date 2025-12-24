import { createServer } from 'http'
import { config } from './config.js'
import { createSocketServer } from './socket.js'

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }

  res.writeHead(404)
  res.end()
})

const io = createSocketServer(httpServer)

httpServer.listen(config.port, () => {
  const redisInfo = `${config.redis.host}:${config.redis.port}`
  console.log(`
╔═══════════════════════════════════════════════════╗
║     WebSocket Server Started                      ║
╠═══════════════════════════════════════════════════╣
║  Port:        ${config.port.toString().padEnd(35)}║
║  CORS Origin: ${config.corsOrigin.padEnd(35)}║
║  Redis:       ${redisInfo.padEnd(35)}║
╚═══════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[Server] HTTP server closed')
    process.exit(0)
  })
})
