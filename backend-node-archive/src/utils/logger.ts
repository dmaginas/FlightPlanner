/**
 * logger.ts — Simple console request/response logger.
 *
 * No external dependencies (no morgan). Logs method, path, status, and
 * response time. Uses ISO timestamps for easy log parsing.
 */

import { Request, Response, NextFunction } from 'express'

function timestamp(): string {
  return new Date().toISOString()
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()

  res.on('finish', () => {
    const ms = Date.now() - start
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO'
    console.log(`[${timestamp()}] ${level} ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`)
  })

  next()
}

export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  console.log(`[${timestamp()}] ${level} ${message}`)
}
