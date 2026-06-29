import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { sessionOptions } from '@/lib/auth'
import type { SessionData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { password?: string }
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Mot de passe requis' },
        { status: 400 }
      )
    }

    const hashedPassword = process.env.APP_PASSWORD
    if (!hashedPassword) {
      console.error('APP_PASSWORD environment variable is not set')
      return NextResponse.json(
        { error: 'Configuration manquante' },
        { status: 500 }
      )
    }

    const match = await bcrypt.compare(password, hashedPassword)

    if (!match) {
      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.isLoggedIn = true
    session.lastActivity = Date.now()
    await session.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
