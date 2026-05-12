import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  const session = getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')
  return <AdminDashboardClient adminEmail={session.email} />
}
