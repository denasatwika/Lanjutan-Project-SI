import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'
const FALLBACK_MAX_BYTES = 5 * 1024 * 1024
const configuredLimit = Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_BYTES)
const configuredGateway = (process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? '').trim()
const PINATA_GATEWAY_BASE = (configuredGateway || 'https://gateway.pinata.cloud').replace(/\/$/, '')

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

function normalizeGatewayUrl(url?: string | null, cid?: string | null) {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.includes('/ipfs/')) return trimmed

  const identifier = cid?.trim() ?? inferIdentifier(trimmed)
  if (!identifier) return trimmed
  const idx = trimmed.indexOf(identifier)
  if (idx === -1) return trimmed

  const prefix = trimmed.slice(0, idx)
  const suffix = trimmed.slice(idx)
  const separator = prefix.endsWith('/') ? '' : '/'
  const normalized = `${prefix}${separator}ipfs/${suffix}`
  return normalized.replace(/\/{2,}ipfs/, '/ipfs')
}

function inferIdentifier(input: string) {
  const withoutQuery = input.split(/[?#]/)[0]
  const segments = withoutQuery.split('/').filter(Boolean)
  return segments.length ? segments[segments.length - 1] : null
}

export function normalizeAttachmentUrl(url?: string | null, cid?: string | null) {
  const normalized = normalizeGatewayUrl(url, cid)
  if (normalized) return normalized
  if (!cid) return null
  return `${PINATA_GATEWAY_BASE}/ipfs/${cid}`
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
    const details = payload?.details ? { details: payload.details } : undefined
    throw new HttpError(message, response.status, details)
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

export type AttachmentUploadMetadata = {
  requesterId?: string
  requestType?: string
  requestId?: string
}

export async function uploadAttachment(
  file: File,
  uploaderId: string,
  metadata?: AttachmentUploadMetadata,
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
  if (metadata?.requesterId) form.append('requesterId', metadata.requesterId)
  if (metadata?.requestType) form.append('requestType', metadata.requestType)
  if (metadata?.requestId) form.append('requestId', metadata.requestId)

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
