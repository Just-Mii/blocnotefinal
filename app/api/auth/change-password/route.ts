import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { oldPassword, newPassword } = body

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'Le nouveau mot de passe doit faire au moins 6 caractères' },
      { status: 400 }
    )
  }

  const storedHash = process.env.APP_PASSWORD
  if (!storedHash) {
    return NextResponse.json({ error: 'APP_PASSWORD non configurée sur le serveur' }, { status: 500 })
  }

  const isValid = await bcrypt.compare(oldPassword, storedHash)
  if (!isValid) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })
  }

  // This app authenticates via an env var (bcrypt hash), not a DB column.
  // We cannot persist the new password here — the user must update the Vercel env var.
  const newHash = await bcrypt.hash(newPassword, 10)

  return NextResponse.json({
    message:
      "Pour changer le mot de passe, mettez à jour APP_PASSWORD dans Vercel avec le hash suivant :",
    newHash,
    instructions:
      "1. Copiez le hash ci-dessus. " +
      "2. Allez sur vercel.com > votre projet > Settings > Environment Variables. " +
      "3. Mettez à jour APP_PASSWORD avec ce hash. " +
      "4. Redéployez l'application.",
  })
}
