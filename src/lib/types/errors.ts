/**
 * HTTP error with status code
 * Used for API errors that include HTTP status codes
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HttpError'
  }

  /**
   * Create HttpError from fetch Response
   */
  static async fromResponse(response: Response): Promise<HttpError> {
    let message = `HTTP ${response.status}: ${response.statusText}`
    let details: Record<string, unknown> | undefined

    try {
      const body = await response.json()
      if (typeof body.message === 'string') {
        message = body.message
      } else if (typeof body.error === 'string') {
        message = body.error
      }
      if (body.details && typeof body.details === 'object') {
        details = body.details as Record<string, unknown>
      }
    } catch {
      // Response body is not JSON, use default message
    }

    return new HttpError(message, response.status, details)
  }

  /**
   * Check if error is an HttpError
   */
  static isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError
  }

  /**
   * Safely get status from any error
   */
  static getStatus(error: unknown): number | undefined {
    if (this.isHttpError(error)) {
      return error.status
    }
    return undefined
  }
}
