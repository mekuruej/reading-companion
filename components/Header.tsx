'use client'
import { useEffect, useState } from 'react'
import { supabase } from "../lib/supabaseClient";
import Link from 'next/link'

export default function Header() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    // Check current session
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })

    // Listen for login/logout changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  return (
    <header className="border-b shadow-sm bg-amber-100">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="font-bold text-xl text-amber-700 hover:text-amber-800 transition">
  📖 Mekuru Reading Companion
</Link>
<p className="text-sm text-gray-500 italic mt-1">
  Every word carries the memory of where you met it.  
</p>





        <nav className="flex items-center gap-4">
          {/* New navigation links */}
          <Link href="/books" className="text-amber-800 hover:underline">
            Books
          </Link>
          <Link href="/vocab" className="text-amber-800 hover:underline">
            Vocab
          </Link>

          {!email ? (
            <Link href="/login" className="text-blue-600 underline">
              Log in
            </Link>
          ) : (
            <>
              <span className="text-gray-700 text-sm">{email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
