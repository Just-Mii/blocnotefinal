import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()

  if (!session) {
    redirect('/login')
  }

  return <AppLayout>{children}</AppLayout>
}
