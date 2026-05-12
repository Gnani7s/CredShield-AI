import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
// Visit: POST /api/debug-login with { email, password }
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const results: Record<string, any> = {
    step1_env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING',
      jwtSecret: process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING',
    }
  }

  // Step 2: Try to fetch user
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, role, blocked')
      .eq('email', email)
      .single()

    if (error) {
      results.step2_db_query = { error: error.message, code: error.code }
    } else if (!user) {
      results.step2_db_query = { found: false, message: 'No user with that email' }
    } else {
      results.step2_db_query = {
        found: true,
        id: user.id,
        email: user.email,
        role: user.role,
        blocked: user.blocked,
        hash_prefix: user.password_hash?.slice(0, 7),
        hash_length: user.password_hash?.length,
      }

      // Step 3: Test bcrypt
      try {
        const valid = await bcrypt.compare(password, user.password_hash)
        results.step3_bcrypt = { valid, message: valid ? '✅ Password matches' : '❌ Password does NOT match hash in DB' }
      } catch (bcryptErr: any) {
        results.step3_bcrypt = { error: bcryptErr.message }
      }
    }
  } catch (dbErr: any) {
    results.step2_db_query = { exception: dbErr.message }
  }

  // Step 4: List all users (just emails + roles) to confirm DB connection
  try {
    const { data: allUsers, error } = await supabaseAdmin
      .from('users')
      .select('email, role, blocked, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    results.step4_all_users = error
      ? { error: error.message }
      : { count: allUsers?.length, users: allUsers }
  } catch (e: any) {
    results.step4_all_users = { exception: e.message }
  }

  return NextResponse.json(results, { status: 200 })
}
