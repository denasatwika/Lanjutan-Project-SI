const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'
const FALLBACK_MAX_BYTES = 5 * 1024 * 1024
const configuredLimit = Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_BYTES)

export const MAX_ATTACHMENT_BYTES =
  Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : FALLBACK_MAX_BYTES

type ErrorPayload = { error?: string; details?: string }

export type AttachmentInfo = {
  id: string
  cid?: string | null
  url?: string | null
  name: string
  size: number
  mimeType: string
  createdAt: string
  downloadPath: string
}

export type AttachmentUploadResponse = AttachmentInfo

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

export function withImageOptimisation(url: string, params: Record<string, string> = { 'img-width': '800' }) {
  try {
    const parsed = new URL(url)
    for (const [key, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.append(key, value)
    }
    return parsed.toString()
  } catch {
    const hasQuery = url.includes('?')
    const serialized = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    return hasQuery ? `${url}&${serialized}` : `${url}?${serialized}`
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const payload = data as ErrorPayload | undefined
    const message =
      payload?.details ??
      payload?.error ??
      response.statusText ??
      'Attachment upload failed'
    const error = new Error(message)
    ;(error as any).status = response.status
    if (payload?.details) (error as any).details = payload.details
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

type UploadAttachmentOptions = {
  signal?: AbortSignal
}

export async function uploadAttachment(
  file: File,
  uploaderId: string,
  options?: UploadAttachmentOptions,
): Promise<AttachmentInfo> {
  if (!(file instanceof File)) {
    throw new Error('No file selected for upload.')
  }

  if (!uploaderId) {
    throw new Error('Missing uploader information. Please sign in again.')
  }

  if (!isSupportedAttachmentType(file.type)) {
    throw new Error('Only PDF or image files are allowed.')
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File exceeds the ${formatAttachmentSize(MAX_ATTACHMENT_BYTES)} limit.`)
  }

  const form = new FormData()
  form.append('file', file)
  form.append('uploaderId', uploaderId)

  const response = await fetch(`${API_BASE}/uploads/attachments`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    signal: options?.signal,
  })

  return parseJson<AttachmentInfo>(response)
}

export async function getAttachment(id: string, init?: { signal?: AbortSignal }): Promise<AttachmentInfo> {
  const response = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'GET',
    credentials: 'include',
    signal: init?.signal,
  })

  return parseJson<AttachmentInfo>(response)
}
