const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'
const FALLBACK_MAX_BYTES = 5 * 1024 * 1024
const configuredLimit = Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_BYTES)

export const MAX_ATTACHMENT_BYTES =
  Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : FALLBACK_MAX_BYTES

type ErrorPayload = { error?: string }

export type AttachmentUploadResponse = {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
  downloadPath: string
}

export function formatAttachmentSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`
}

export function buildAttachmentDownloadUrl(id: string, downloadPath?: string) {
  if (downloadPath?.startsWith('http')) return downloadPath
  const basePath = downloadPath ?? `/attachments/${id}/file`
  const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`
  return `${API_BASE}${normalizedPath}`
}

export function isSupportedAttachmentType(mime: string) {
  if (!mime) return true
  if (mime === 'application/pdf') return true
  if (mime.startsWith('image/')) return true
  return false
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Attachment upload failed'
    const error = new Error(message)
    ;(error as any).status = response.status
    throw error
  }

  return data as T
}

function safeParseJSON(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

export async function uploadAttachment(file: File, init?: { signal?: AbortSignal }): Promise<AttachmentUploadResponse> {
  if (!(file instanceof File)) {
    throw new Error('No file selected for upload.')
  }

  if (!isSupportedAttachmentType(file.type)) {
    throw new Error('Only PDF or image files are allowed.')
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File exceeds the ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)} limit.`)
  }

  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${API_BASE}/attachments`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    signal: init?.signal,
  })

  return parseJson<AttachmentUploadResponse>(response)
}
