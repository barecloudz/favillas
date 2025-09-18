import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-supabase-auth'

export default function AuthCallback() {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const { user, loading } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Auth callback started')

        // Check if we have tokens in the URL fragment
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)

        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          console.log('🔑 Setting session from URL tokens')
          // Set the session with the tokens from the URL fragment
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            console.error('❌ Error setting session:', error)
            toast({
              title: 'Authentication failed',
              description: error.message,
              variant: 'destructive',
            })
            navigate('/auth?error=auth_error')
            return
          }

          console.log('✅ Session set successfully, waiting for auth hook to process')
          // Don't navigate immediately - wait for auth hook to process
        } else {
          console.log('⚠️ No tokens in URL fragment, checking existing session')
          // Fallback: try to get existing session
          const { data, error } = await supabase.auth.getSession()

          if (error) {
            console.error('❌ Auth callback error:', error)
            navigate('/auth?error=auth_error')
            return
          }

          if (!data.session) {
            console.log('❌ No session found')
            navigate('/auth')
            return
          }

          console.log('✅ Found existing session, waiting for auth hook to process')
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error)
        toast({
          title: 'Authentication failed',
          description: 'There was an error completing your sign-in.',
          variant: 'destructive',
        })
        navigate('/auth?error=auth_error')
      }
    }

    handleAuthCallback()
  }, [navigate, toast])

  // Watch for auth state changes and navigate when user is loaded
  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('✅ User authenticated, redirecting to home')
        toast({
          title: 'Welcome!',
          description: `Welcome back, ${user.firstName || 'User'}!`,
        })
        navigate('/')
      } else {
        // If auth processing is complete but no user, redirect to auth
        console.log('❌ No user after auth processing, redirecting to auth')
        navigate('/auth')
      }
    }
  }, [user, loading, navigate, toast])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d73a31] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign-In...</h2>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
