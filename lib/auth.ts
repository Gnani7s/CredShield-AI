import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!
const COOKIE = 'cs_session'

// Helper to get cookie options
export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
})

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12)
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash)

export function createToken(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try { return jwt.verify(token, JWT_SECRET) as any }
  catch { return null }
}

export function setSession(token: string) {
  cookies().set(COOKIE, token, getCookieOptions())
}

export function clearSession() { cookies().delete(COOKIE) }

export function getSession() {
  const token = cookies().get(COOKIE)?.value
  return token ? verifyToken(token) : null
}

export async function getUserById(id: string) {
  const { data } = await supabaseAdmin.from('users').select('*').eq('id', id).single()
  return data
}
