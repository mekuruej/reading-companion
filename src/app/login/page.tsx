'use client'
import { supabase } from '@/lib/supabaseClient'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sign in</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          // 👇 This is the key line that enables Google sign-in
          providers={['google']}
          redirectTo={
            typeof window !== 'undefined' ? window.location.origin : undefined
          }
        />
      </div>
    </main>
  )
}
