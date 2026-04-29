import type { NextConfig } from "next";

function originFromEnv(value: string | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function websocketCompanionOrigins(origin: string | null) {
  if (!origin) {
    return []
  }

  if (origin.startsWith("ws://")) {
    return [origin, origin.replace("ws://", "http://")]
  }

  if (origin.startsWith("wss://")) {
    return [origin, origin.replace("wss://", "https://")]
  }

  if (origin.startsWith("http://")) {
    return [origin, origin.replace("http://", "ws://")]
  }

  if (origin.startsWith("https://")) {
    return [origin, origin.replace("https://", "wss://")]
  }

  return [origin]
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function buildContentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== "production"
  const appOrigin = originFromEnv(process.env.NEXT_PUBLIC_APP_URL)
  const wsOrigin = originFromEnv(process.env.NEXT_PUBLIC_WS_URL)
  const rollyPayOrigin = originFromEnv(
    process.env.ROLLYPAY_API_URL || "https://rollypay.io"
  )
  const devConnectOrigins = isDev
    ? [
        "http://localhost:3000",
        "ws://localhost:3000",
        "http://localhost:3001",
        "ws://localhost:3001",
      ]
    : []

  const directives = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'", rollyPayOrigin],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "connect-src": uniqueValues([
      "'self'",
      appOrigin,
      rollyPayOrigin,
      ...websocketCompanionOrigins(wsOrigin),
      ...devConnectOrigins,
    ]),
    "frame-src": ["'none'"],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => {
      const filteredSources = uniqueValues(sources)
      return `${directive} ${filteredSources.join(" ")}`
    })
    .join("; ")
}

const nextConfig: NextConfig = {
  output: "standalone", // For Docker deployment
  poweredByHeader: false,
  reactCompiler: true,
  turbopack: {},
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/ws-server/dist/**",
          "**/src/generated/prisma/**",
        ],
      }
    }

    return config
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Увеличиваем лимит для загрузки изображений
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
