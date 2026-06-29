// Shared iron-session options — importable from both middleware (Edge)
// and server components (Node.js) without pulling in next/headers.

import type { SessionOptions } from 'iron-session'
import type { SessionData } from '@/types'

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'blocnote-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

// Re-export the type so callers can use it without a separate import
export type { SessionData }
