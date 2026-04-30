import path from "path"

function resolveStoragePath(value: string | undefined, fallback: string) {
  if (!value?.trim()) {
    return fallback
  }

  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value)
}

export function publicUploadRoot() {
  return resolveStoragePath(
    process.env.UPLOAD_DIR,
    path.join(process.cwd(), "public", "uploads")
  )
}

export function privateDownloadRoot() {
  return resolveStoragePath(
    process.env.DOWNLOAD_DIR,
    path.join(process.cwd(), "downloads")
  )
}

export function messageUploadRoot() {
  return resolveStoragePath(
    process.env.MESSAGE_UPLOAD_DIR,
    path.join(process.cwd(), "uploads", "messages")
  )
}
